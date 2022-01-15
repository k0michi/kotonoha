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

export class Deck extends EventEmitter {
  id;
  name;
  entries;
  createdAt;
  attempts;
  scores;
  latestAttemptDates;
  attemptCounts;

  constructor(id, name, entries = [], createdAt = new Date(), attempts = [], scores = []) {
    super();
    this.id = id;
    this.name = name;
    this.entries = entries;
    this.createdAt = createdAt;
    this.attempts = attempts;
    this.scores = scores;

    this.latestAttemptDates = [];
    this.attemptCounts = [];
    this.attemptCounts.length = this.entries.length;
    this.attemptCounts.fill(0);

    for (const attempt of this.attempts) {
      this.updateAttemptDate(attempt.entryID, attempt.gradedAt);
      this.incrementAttemptCount(attempt.entryID);
    }
  }

  incrementAttemptCount(entryID) {
    this.attemptCounts[entryID]++;
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
    const cards = [];

    for (const entry of this.entries) {
      if (this.attemptCounts[entry.id] == 0) {
        cards.push(entry);
      }
    }

    return cards;
  }

  getReviewCards() {
    const cards = [];
    const now = new Date();

    for (const entry of this.entries) {
      if (this.attemptCounts[entry.id] > 0) {
        if (this.getDueDate(entry.id) < now) {
          cards.push(entry);
        }
      }
    }

    return cards;
  }

  getPracticeCards() {
    const cards = [];

    for (const entry of this.entries) {
      if (this.attemptCounts[entry.id] > 0) {
        cards.push(entry);
      }
    }

    return cards;
  }

  getScore(entryID: number) {
    return this.scores[entryID];
  }

  setScore(entryID: number, score) {
    this.scores[entryID] = score;
  }

  startAttempt(entryID: number) {
    const id = this.attempts.length;
    const questionedAt = new Date();
    const attempt = { id, entryID, questionedAt };
    this.attempts.push(attempt);
    this.incrementAttemptCount(entryID);
    return id;
  }

  answerAttempt(attemptID: number) {
    this.attempts[attemptID].answeredAt = new Date();
  }

  gradeAttempt(attemptID: number, grade: number) {
    this.attempts[attemptID].gradedAt = new Date();
    this.attempts[attemptID].grade = grade;
    this.updateAttemptDate(attemptID, this.attempts[attemptID].gradedAt);
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