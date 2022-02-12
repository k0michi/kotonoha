import { monotonicFactory } from 'ulid'
import deepEqual from 'deep-equal';
import { produce } from 'immer';
import * as utils from './utils';
import * as scheduler from './scheduler';
import StoreBase from './store-base';
import { Attempt, Deck, QuestionMode, Step } from './interfaces';

const ulid = monotonicFactory();

const bridge = globalThis.bridge;

const DailyMax = 20;

export interface StoreState {
  deckIndex: { [key: string]: Deck };
  deck: Deck;
  deckExtra: DeckExtra;
  study: StudyState;
}

export interface StudyState {
  isPractice;
  currentEntryID;
  showingAnswer;
  typedLetters;
}

export interface DeckExtra {
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
      deckExtra: null,
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
      draft.deckExtra = deckData;
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
      draft.deckExtra.attemptCounts[entryID]++;

      switch (step) {
        case Step.New:
          draft.deckExtra.newCount++;
          break;
        case Step.Review:
          draft.deckExtra.reviewCount++;
          break;
        case Step.Practice:
          draft.deckExtra.practiceCount++;
          break;
      }
    }));
  }

  setDueDate(entryID, dueDate) {
    this.setState(produce(this.state, draft => {
      draft.deckExtra.dueDates[entryID] = dueDate;
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

    if (this.state.deckExtra.attemptCounts[entryID] == 0) {
      return Step.New;
    } else {
      if (this.state.deckExtra.dueDates[entryID] < now) {
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
      draft.deckExtra.ongoingAttempt = attempt;
      draft.study.currentEntryID = entryID;
      draft.study.showingAnswer = false;
      draft.study.typedLetters = 0;
    }));

    return id;
  }

  answerAttempt() {
    if (this.state.deckExtra.ongoingAttempt == null) {
      return;
    }

    this.setState(produce(this.state, draft => {
      draft.deckExtra.ongoingAttempt.answeredAt = new Date();
      draft.study.showingAnswer = true;
    }));
  }

  gradeAttempt(grade: number) {
    if (this.state.deckExtra.ongoingAttempt == null) {
      return;
    }

    const gradedAt = new Date();

    this.setState(produce(this.state, draft => {
      draft.deckExtra.ongoingAttempt.gradedAt = gradedAt;
      draft.deckExtra.ongoingAttempt.grade = grade;
      draft.deck.attempts.push(draft.deckExtra.ongoingAttempt);
    }));

    const entryID = this.state.deckExtra.ongoingAttempt.entryID;

    this.addAttemptCount(entryID, this.state.deckExtra.ongoingAttempt.step);

    if (this.state.deckExtra.ongoingAttempt.step != Step.Practice) {
      const currentScore = this.getScore(entryID);
      const newScore = scheduler.sm2((3 - grade) * (5 / 3), currentScore);
      this.setScore(entryID, newScore);
      const dueDate = this.calculateDueDate(gradedAt, newScore.interval);
      this.setDueDate(entryID, dueDate);
    }

    this.setState(produce(this.state, draft => {
      draft.deckExtra.ongoingAttempt = null;
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

export const store = new Store();