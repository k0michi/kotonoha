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

export class Deck {
  id;
  name;
  entries;
  createdAt;
  attempts;
  scores;
  entryMap;

  constructor(id, name, entries = [], createdAt = new Date(), attempts = [], scores = {}) {
    this.id = id;
    this.name = name;
    this.entries = entries;
    this.createdAt = createdAt;
    this.attempts = attempts;
    this.scores = scores;

    this.entryMap = {};

    for (const e of this.getAllEntries()) {
      this.entryMap[e.word] = e;
    }
  }

  getAllEntries() {
    const entries = [];

    for (const e of this.entries) {
      entries.push(e);

      if (e.derivatives != null) {
        for (const d of e.derivatives) {
          entries.push(d);
        }
      }
    }

    return entries;
  }

  getScore(word) {
    return this.scores[word];
  }

  setScore(word: string, score: Score) {
    this.scores[word] = score;
  }

  startAttempt(word: string) {
    const id = this.attempts.length;
    const questionedAt = new Date();
    const attempt = { id, word, questionedAt };
    this.attempts.push(attempt);
    return id;
  }

  answerAttempt(attemptID: number) {
    this.attempts[attemptID].answeredAt = new Date();
  }

  gradeAttempt(attemptID: number, grade: number) {
    this.attempts[attemptID].gradedAt = new Date();
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
  word: string;
  grade?: number;
  questionedAt: Date;
  answeredAt?: Date;
  gradedAt?: Date;
}

export interface Score {
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