import { EventEmitter } from 'events';
import { monotonicFactory } from 'ulid'
import deepEqual from 'deep-equal';

const ulid = monotonicFactory();

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
    const id = ulid();
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

export enum Step {
  New, Review, Practice
}

export class Deck extends EventEmitter {
  id;
  name;
  entries: { [key: string]: any };
  createdAt;
  attempts;
  scores;
  latestAttemptDates = {};
  attemptCounts = {};
  newCount = 0;
  reviewCount = 0;
  practiceCount = 0;
  date;
  ongoingAttempt;

  constructor(id, name, entries = {}, createdAt = new Date(), attempts = [], scores = {}) {
    super();
    this.id = id;
    this.name = name;
    this.entries = entries;
    this.createdAt = createdAt;
    this.attempts = attempts;
    this.scores = scores;

    for (const entry of Object.values(this.entries)) {
      this.attemptCounts[entry.id] = 0;
    }

    for (const attempt of this.attempts) {
      this.updateAttemptDate(attempt.entryID, attempt.gradedAt);
      this.incrementAttemptCount(attempt.entryID, attempt.step);
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

  incrementAttemptCount(entryID, step) {
    this.attemptCounts[entryID]++;

    switch (step) {
      case Step.New:
        this.newCount++;
        break;
      case Step.Review:
        this.reviewCount++;
        break;
      case Step.Practice:
        this.practiceCount++;
        break;
    }
  }

  updateAttemptDate(entryID, date) {
    this.latestAttemptDates[entryID] = date;
  }

  findEntry(word) {
    return Object.values(this.entries).find(e => e.word == word);
  }

  addEntry(entry, date) {
    const found = this.findEntry(entry.word);

    if (found == null) {
      const id = ulid(date.getTime());
      entry.id = id;
      entry.createdAt = date;
      entry.updatedAt = date;
      this.entries[id] = entry;
      this.setScore(entry.id, { repetitions: 0, easeFactor: 2.5, interval: 1, id });
    } else if (!deepEqual(found.definitions, entry.definitions)) {
      this.updateEntry(found.id, entry.definitions, date);
    }

    this.emit('change');
  }

  updateEntry(entryID, newDefinitions, date) {
    this.entries[entryID].definitions = newDefinitions;
    this.entries[entryID].updatedAt = date;
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
    return Object.values(this.entries).filter((e => this.getStep(e.id) == Step.New).bind(this));
  }

  getReviewCards() {
    return Object.values(this.entries).filter((e => this.getStep(e.id) == Step.Review).bind(this));
  }

  getPracticeCards() {
    return Object.values(this.entries).filter((e => this.getStep(e.id) == Step.Practice).bind(this));
  }

  getScore(entryID: string) {
    return this.scores[entryID];
  }

  setScore(entryID: string, score) {
    this.scores[entryID] = score;
  }

  getStep(entryID: string): Step {
    const now = new Date();

    if (this.attemptCounts[entryID] == 0) {
      return Step.New;
    } else {
      if (this.getDueDate(entryID) < now) {
        return Step.Review;
      } else {
        return Step.Practice;
      }
    }
  }

  startAttempt(entryID: string) {
    const id = this.attempts.length;
    const questionedAt = new Date();
    const step = this.getStep(entryID);
    const attempt = { id, entryID, questionedAt, step };
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

    this.incrementAttemptCount(this.ongoingAttempt.entryID, this.ongoingAttempt.step);
    this.updateAttemptDate(this.ongoingAttempt.entryID, this.ongoingAttempt.gradedAt);
    this.ongoingAttempt = null;
    this.emit('change');
  }

  addAttempt(attempt: Attempt) {
    this.attempts.push(attempt);
  }

  importDeck(wordList) {
    const now = new Date();

    for (const e of wordList.entries) {
      if (e.derivatives != null) {
        for (const d of e.derivatives) {
          this.addEntry(d, now);
        }
      }

      delete e.derivatives;
      this.addEntry(e, now);
    }

    this.emit('change');
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
  entryID: string;
  grade?: number;
  questionedAt: Date;
  answeredAt?: Date;
  gradedAt?: Date;
}

export interface Score {
  entryID: string;
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