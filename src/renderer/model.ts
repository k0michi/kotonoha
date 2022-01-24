import { monotonicFactory } from 'ulid'
import deepEqual from 'deep-equal';
import { produce } from 'immer';
import * as utils from './utils';
import * as scheduler from './scheduler';

const ulid = monotonicFactory();

const bridge = globalThis.bridge;

const DailyMax = 20;

export class StoreBase<T> {
  listeners = [];
  state: T = null;

  constructor(initialState: T) {
    this.state = initialState;
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  unsubscribe(listener) {
    this.listeners.splice(this.listeners.indexOf(listener), 1);
  }

  setState(newState: T) {
    this.state = newState;

    for (const listener of this.listeners) {
      listener();
    }
  }
}

export interface StoreState {
  deckIndex: { [key: string]: Deck };
  deck: Deck;
  deckData: DeckData;
  study: StudyState;
}

export interface StudyState {
  isPractice;
  currentEntryID;
  showingAnswer;
  typedLetters;
}

export interface DeckData {
  dueDates: { [key: string]: Date };
  attemptCounts: { [key: string]: number };
  newCount: number;
  reviewCount: number;
  practiceCount: number;
  lastStudyDate: Date;
  ongoingAttempt: Attempt;
}

export class Store extends StoreBase<StoreState> {
  config;
  entryQueue: string[];

  constructor() {
    super({
      deckIndex: {},
      deck: null,
      deckData: null,
      study: null
    });

    this.entryQueue = [];
  }

  async initializeIndex() {
    this.config = await bridge.getConfig();
    const deckFiles = await bridge.readDir(this.config.decksPath);

    const deckIndex = {};

    if (deckFiles != null) {
      for (const deckFile of deckFiles) {
        const deck = await this.loadDeck(deckFile);
        delete deck.entries;
        deckIndex[deck.id] = deck;
      }
    }

    this.setState(produce(this.state, draft => {
      draft.deckIndex = deckIndex;
    }));
  }

  async initializeDeck(id) {
    this.config = await bridge.getConfig();
    const deck = await this.loadDeckFromID(id);
    const deckData = {
      dueDates: {},
      attemptCounts: {},
      newCount: 0,
      reviewCount: 0,
      practiceCount: 0,
      lastStudyDate: new Date(),
      ongoingAttempt: null
    };

    for (const entry of Object.values(deck.entries)) {
      deckData.attemptCounts[entry.id] = 0;
    }

    for (const attempt of deck.attempts) {
      deckData.attemptCounts[attempt.entryID]++;

      switch (attempt.step) {
        case Step.New:
          deckData.newCount++;
          break;
        case Step.Review:
          deckData.reviewCount++;
          break;
        case Step.Practice:
          deckData.practiceCount++;
          break;
      }

      if (attempt.step != Step.Practice) {
        const score = deck.scores[attempt.entryID];
        deckData.dueDates[attempt.entryID] = this.calculateDueDate(attempt.gradedAt, score.interval);
      }
    }

    this.setState(produce(this.state, draft => {
      draft.deck = deck;
      draft.deckData = deckData;
    }));
  }

  initializeEntryQueue(isPractice) {
    this.setState(produce(this.state, draft => {
      draft.study = {
        isPractice,
        currentEntryID: null,
        showingAnswer: false,
        typedLetters: 0
      };
    }));

    if (isPractice) {
      this.entryQueue = this.getPracticeCards();
    } else {
      const newCards = this.getNewCards();
      this.entryQueue = [];

      for (let i = 0; i < DailyMax && newCards.length > 0; i++) {
        this.entryQueue.push(...newCards.splice(utils.random(0, newCards.length), 1));
      }

      this.entryQueue = this.entryQueue.concat(this.getReviewCards());

      if (this.entryQueue.length == 0) {
        this.entryQueue = this.getNewCards();
      }
    }
  }

  createNewDeck(name) {
    const now = new Date();
    const id = ulid();
    const deck = {
      id,
      name,
      entries: {},
      createdAt: now,
      attempts: [],
      scores: {}
    };

    this.setState(produce(this.state, draft => {
      draft.deckIndex[id] = deck;
    }));

    this.saveDeck(deck);
  }

  async loadDeckFromID(id) {
    return await this.loadDeck(bridge.path.format({
      dir: this.config.decksPath,
      name: id,
      ext: '.json'
    }));
  }

  async loadDeck(file) {
    const content = await bridge.readFile(file);
    const deck = utils.parseJSON(content) as Deck;
    return deck;
  }

  async saveCurrentDeck() {
    await this.saveDeck(this.state.deck);
  }

  async saveDeck(deck) {
    const json = JSON.stringify(deck);

    await bridge.makeDir(this.config.decksPath);
    await bridge.saveFile(bridge.path.format({
      dir: this.config.decksPath,
      name: deck.id,
      ext: '.json'
    }), json);
  }

  initializeDailyCount() {
    /* const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today > this.lastStudyDate) {
      this.newCount = 0;
      this.reviewCount = 0;
      this.practiceCount = 0;
      this.lastStudyDate = new Date();
      this.emit('change');
    }*/
  }

  addAttemptCount(entryID, step) {
    this.setState(produce(this.state, draft => {
      draft.deckData.attemptCounts[entryID]++;

      switch (step) {
        case Step.New:
          draft.deckData.newCount++;
          break;
        case Step.Review:
          draft.deckData.reviewCount++;
          break;
        case Step.Practice:
          draft.deckData.practiceCount++;
          break;
      }
    }));
  }

  setAttemptDate(entryID, date) {
    this.setState(produce(this.state, draft => {
      const score = draft.deck.scores[entryID];
      draft.deckData.dueDates[entryID] = this.calculateDueDate(date, score.interval);
    }));
  }

  findEntry(word) {
    return Object.values(this.state.deck.entries).find(e => e.word == word)?.id;
  }

  setScore(entryID: string, score) {
    this.setState(produce(this.state, draft => {
      draft.deck.scores[entryID] = score;
    }));
  }

  addEntry(entry, date) {
    const foundID = this.findEntry(entry.word);

    if (foundID == null) {
      const id = ulid(date.getTime());
      entry.id = id;
      entry.createdAt = date;
      entry.updatedAt = date;

      this.setState(produce(this.state, draft => {
        draft.deck.entries[id] = entry;
      }));

      this.setScore(id, { repetitions: 0, easeFactor: 2.5, interval: 1, id });
    } else {
      const found = this.state.deck.entries[foundID];

      if (!deepEqual(found.definitions, entry.definitions)) {
        this.updateEntry(foundID, entry.definitions, date);
      }
    }
  }

  updateEntry(entryID, newDefinitions, date) {
    this.setState(produce(this.state, draft => {
      draft.deck.entries[entryID].definitions = newDefinitions;
      draft.deck.entries[entryID].updatedAt = date;
    }));
  }

  setName(name) {
    this.setState(produce(this.state, draft => {
      draft.deck.name = name;
    }));
  }

  calculateDueDate(lastDate, interval) {
    const dueDate = new Date(lastDate);
    dueDate.setDate(dueDate.getDate() + interval);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate;
  }

  getStep(entryID: string): Step {
    const now = new Date();

    if (this.state.deckData.attemptCounts[entryID] == 0) {
      return Step.New;
    } else {
      if (this.state.deckData.dueDates[entryID] < now) {
        return Step.Review;
      } else {
        return Step.Practice;
      }
    }
  }

  getNewCards() {
    return Object.values(this.state.deck.entries).filter((e => this.getStep(e.id) == Step.New).bind(this)).map(e => e.id);
  }

  getReviewCards() {
    return Object.values(this.state.deck.entries).filter((e => this.getStep(e.id) == Step.Review).bind(this)).map(e => e.id);
  }

  getPracticeCards() {
    return Object.values(this.state.deck.entries).filter((e => this.getStep(e.id) == Step.Practice).bind(this)).map(e => e.id);
  }

  getScore(entryID) {
    return this.state.deck.scores[entryID];
  }

  addTypedLetters() {
    this.setState(produce(this.state, draft => {
      draft.study.typedLetters++;
    }));
  }

  queueRemaining() {
    return this.entryQueue.length;
  }

  startAttempt(mode: QuestionMode) {
    const entryID = this.entryQueue.shift();
    const id = this.state.deck.attempts.length;
    const questionedAt = new Date();
    const step = this.getStep(entryID);
    const attempt = { id, entryID, questionedAt, step, mode };

    this.setState(produce(this.state, draft => {
      draft.deckData.ongoingAttempt = attempt;
      draft.study.currentEntryID = entryID;
      draft.study.showingAnswer = false;
      draft.study.typedLetters = 0;
    }));

    return id;
  }

  answerAttempt() {
    if (this.state.deckData.ongoingAttempt == null) {
      return;
    }

    this.setState(produce(this.state, draft => {
      draft.deckData.ongoingAttempt.answeredAt = new Date();
      draft.study.showingAnswer = true;
    }));
  }

  gradeAttempt(grade: number) {
    if (this.state.deckData.ongoingAttempt == null) {
      return;
    }

    this.setState(produce(this.state, draft => {
      draft.deckData.ongoingAttempt.gradedAt = new Date();
      draft.deckData.ongoingAttempt.grade = grade;
      draft.deck.attempts.push(draft.deckData.ongoingAttempt);
    }));

    const entryID = this.state.deckData.ongoingAttempt.entryID;

    this.addAttemptCount(entryID, this.state.deckData.ongoingAttempt.step);

    if (this.state.deckData.ongoingAttempt.step != Step.Practice) {
      this.setAttemptDate(entryID, this.state.deckData.ongoingAttempt.gradedAt);
    }

    if (!this.state.study.isPractice) {
      const currentScore = this.getScore(entryID);
      const newScore = scheduler.sm2((3 - grade) * (5 / 3), currentScore);
      this.setScore(entryID, newScore);
    }

    this.setState(produce(this.state, draft => {
      draft.deckData.ongoingAttempt = null;
    }));
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
  }
}

export interface Deck {
  id: string;
  name: string;
  entries?: { [key: string]: Entry };
  createdAt: Date;
  attempts: Attempt[];
  scores: { [key: string]: Score };
}

export interface Entry {
  id: string;
  word: string;
  definitions: Definition[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Definition {
  partOfSpeech: string;
  definition: string;
}

export interface Attempt {
  id: number;
  entryID: string;
  step: number;
  grade?: number;
  questionedAt: Date;
  answeredAt?: Date;
  gradedAt?: Date;
}

export interface Score {
  id: string;
  repetitions: number;
  easeFactor: number;
  interval: number;
}

export enum Step {
  New, Review, Practice
}

export enum QuestionMode {
  Meaning, Spell
}

export const store = new Store();