import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';

const bridge = globalThis.bridge;

export class Store extends EventEmitter {
  decks = {};
  config;

  async initialize() {
    this.config = await bridge.getConfig();
    const deckFiles = await bridge.readDir(this.config.decksPath);

    if (deckFiles != null) {
      for (const deckFile of deckFiles) {
        const deck = await this.loadDeck(deckFile);
        this.decks[deck.id] = deck;
      }
    }
  }

  newDeck(name) {
    const id = nanoid(21);
    const deck = new Deck(id, name);
    this.decks[id] = deck;
    this.emit('change');
    return deck;
  }

  getDeck(id) {
    return this.decks[id];
  }

  getDecks() {
    return this.decks;
  }

  async loadDeck(file) {
    const id = bridge.path.basename(file, bridge.path.extname(file));
    const content = await bridge.readFile(file);
    const deck = Deck.fromJSON(content);
    return deck;
  }

  async saveDeck(deck) {
    const json = deck.toJSON();

    await bridge.makeDir(this.config.decksPath);
    await bridge.saveFile(bridge.path.format({
      dir: this.config.decksPath,
      name: deck.id,
      ext: '.json'
    }), json);
  }
}

export enum AttemptType {
  New, Review, Practice
}

export class Deck extends EventEmitter {
  id;
  name;
  entries;
  createdAt;
  attempts;
  scores;
  latestAttemptDates = [];
  attemptCounts = [];
  newCount = 0;
  reviewCount = 0;
  practiceCount = 0;
  date;
  ongoingAttempt;

  constructor(id, name, entries = [], createdAt = new Date(), attempts = [], scores = []) {
    super();
    this.id = id;
    this.name = name;
    this.entries = entries;
    this.createdAt = createdAt;
    this.attempts = attempts;
    this.scores = scores;

    this.attemptCounts.length = this.entries.length;
    this.attemptCounts.fill(0);

    for (const attempt of this.attempts) {
      this.updateAttemptDate(attempt.entryID, attempt.gradedAt);
      this.incrementAttemptCount(attempt.entryID, attempt.type);
    }

    this.date = new Date();
  }

  updateDayCount() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today > this.date) {
      this.newCount = 0;
      this.reviewCount = 0;
      this.practiceCount = 0;
      this.date = new Date();
      this.emit('change');
    }
  }

  incrementAttemptCount(entryID, type) {
    this.attemptCounts[entryID]++;

    switch (type) {
      case AttemptType.New:
        this.newCount++;
        break;
      case AttemptType.Review:
        this.reviewCount++;
        break;
      case AttemptType.Practice:
        this.practiceCount++;
        break;
    }
  }

  updateAttemptDate(entryID, date) {
    this.latestAttemptDates[entryID] = date;
  }

  addEntry(entry) {
    const id = this.entries.length;
    entry.id = id;
    this.setScore(entry.id, { repetitions: 0, easeFactor: 2.5, interval: 1, id });
    this.entries.push(entry);
    this.emit('change');
  }

  setName(name) {
    this.name = name;
    this.emit('change');
  }

  getDueDate(entryID) {
    const score = this.scores[entryID];
    const dueDate = new Date(this.latestAttemptDates[entryID]);
    dueDate.setDate(dueDate.getDate() + score.interval);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate;
  }

  getNewCards() {
    return this.entries.filter((e => this.getType(e.id) == AttemptType.New).bind(this));
  }

  getReviewCards() {
    return this.entries.filter((e => this.getType(e.id) == AttemptType.Review).bind(this));
  }

  getPracticeCards() {
    return this.entries.filter((e => this.getType(e.id) == AttemptType.Practice).bind(this));
  }

  getScore(entryID: number) {
    return this.scores[entryID];
  }

  setScore(entryID: number, score) {
    this.scores[entryID] = score;
  }

  getType(entryID: number): AttemptType {
    const now = new Date();

    if (this.attemptCounts[entryID] == 0) {
      return AttemptType.New;
    } else {
      if (this.getDueDate(entryID) < now) {
        return AttemptType.Review;
      } else {
        return AttemptType.Practice;
      }
    }
  }

  startAttempt(entryID: number) {
    const id = this.attempts.length;
    const questionedAt = new Date();
    const type = this.getType(entryID);
    const attempt = { id, entryID, questionedAt, type };
    this.ongoingAttempt = attempt;
    return id;
  }

  answerAttempt() {
    this.ongoingAttempt.answeredAt = new Date();
  }

  gradeAttempt(grade: number) {
    this.ongoingAttempt.gradedAt = new Date();
    this.ongoingAttempt.grade = grade;
    this.attempts.push(this.ongoingAttempt);

    this.incrementAttemptCount(this.ongoingAttempt.entryID, this.ongoingAttempt.type);
    this.updateAttemptDate(this.ongoingAttempt.entryID, this.ongoingAttempt.gradedAt);
    this.ongoingAttempt = null;
    this.emit('change');
  }

  addAttempt(attempt: Attempt) {
    this.attempts.push(attempt);
  }

  static fromJSON(json) {
    const parsed = parseJSON(json);
    return new Deck(parsed.id, parsed.name, parsed.entries, parsed.createdAt, parsed.attempts, parsed.scores);
  }

  toJSON() {
    const object = { id: this.id, name: this.name, entries: this.entries, createdAt: this.createdAt, attempts: this.attempts, scores: this.scores };
    return JSON.stringify(object);
  }
}

export interface Attempt {
  id: number;
  entryID: number;
  grade?: number;
  questionedAt: Date;
  answeredAt?: Date;
  gradedAt?: Date;
}

export interface Score {
  entryID: number;
  repetitions: number;
  easeFactor: number;
  interval: number;
}

const timestampExp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function parseJSON(json) {
  return JSON.parse(json, (key, value) => {
    if (typeof value == 'string' && timestampExp.test(value)) {
      return new Date(value);
    } else {
      return value;
    }
  });
}

export const store = new Store();