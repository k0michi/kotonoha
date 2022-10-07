import * as Kyoka from 'kyoka';
import { Dictionary, DictionaryEntry, DictionaryHead } from '../common/dictionary';
import { assignIDs, convertEntries, convertHead } from '../common/kdml';
import { parseXML, serializeXML } from '../common/xml';
import { v4 as uuidv4 } from 'uuid';
import { parseJSON } from './json';
import * as scheduler from './scheduler';

export enum Step {
  New, Review, Done
}

export interface Attempt {
  id: string;
  entryID: string;
  step: number;
  grade: number;
  questioned: Date;
  answered: Date;
  graded: Date;
}

export interface Score {
  id: string;
  repetitions: number;
  easeFactor: number;
  interval: number;
}

export interface ScoreSheet {
  attempts: Attempt[];
  scores: Record<string, Score | undefined>;
}

export interface Session {
  deckID: string;
  entryQueue: string[];

  questioned?: Date;
  answered?: Date;
}

export interface ScoreSheetExtra {
  lastAttempts: Record<string, Attempt | undefined>;
  attemptCounts: Record<string, number | undefined>;
}

export default class Model {
  deckIndex = new Kyoka.Observable<DictionaryHead[]>([]);
  decks = new Kyoka.Observable<Record<string, Dictionary | undefined>>({});
  // scoreSheetsExtra = new Kyoka.Observable<Record<string, ScoreSheetExtra | undefined>>({});
  scoreSheets = new Kyoka.Observable<Record<string, ScoreSheet | undefined>>({});
  currentSession = new Kyoka.Observable<Session | undefined>(undefined);

  constructor() {
  }

  async loadDeckIndex() {
    const ids = await bridge.readDeckIDs();
    const deckIndex: DictionaryHead[] = [];

    for (const id of ids) {
      const content = await bridge.readDeck(id);
      const parsed = parseXML(content);
      const head = convertHead(parsed);
      head.id = id;
      deckIndex.push(head);
    }

    this.deckIndex.set(deckIndex);
  }

  async createNewDeck() {
    const id = uuidv4();
    await bridge.writeDeck(id, blankDeck());
  }

  unloadDeck(id: string) {
    delete this.decks.get()[id];
    this.decks.set(this.decks.get());
    // delete this.scoreSheetsExtra.get()[id];
    // this.scoreSheetsExtra.set(this.scoreSheetsExtra.get());
  }

  async loadDeck(id: string) {
    const content = await bridge.readDeck(id);
    const parsed = parseXML(content);

    if (assignIDs(parsed)) {
      await bridge.writeDeck(id, serializeXML(parsed));
    }

    const head = convertHead(parsed);
    head.id = id;
    const entries = convertEntries(parsed);
    this.decks.get()[id] = { head, entries };
    this.decks.set(this.decks.get());
  }

  async loadScoreSheet(id: string) {
    let content: string;
    let parsed: ScoreSheet;

    try {
      content = await bridge.readScoreSheet(id);
      parsed = parseJSON(content) as ScoreSheet;
    } catch (e) {
      parsed = { attempts: [], scores: {} };
    }

    this.scoreSheets.get()[id] = parsed;
    this.scoreSheets.set(this.scoreSheets.get());

    /*
    const lastAttempts: Record<string, Attempt> = {};
    const attemptCounts: Record<string, number> = {};

    for (const attempt of parsed.attempts) {
      if (attemptCounts[attempt.entryID] == null) {
        attemptCounts[attempt.entryID] = 0;
      }

      attemptCounts[attempt.entryID]++;
      lastAttempts[attempt.entryID] = attempt;
    }

    this.scoreSheetsExtra.get()[id] = { attemptCounts, lastAttempts };
    this.scoreSheetsExtra.set(this.scoreSheetsExtra.get());
    */
  }

  getLastAttempt(deckID: string, entryID: string) {
    const scoreSheet = this.scoreSheets.get()[deckID];
    let last: Attempt | undefined;

    for (const attempt of scoreSheet!.attempts) {
      if (attempt.entryID == entryID) {
        last = attempt;
      }
    }

    return last;
  }

  getDueDate(deckID: string, entryID: string) {
    let dueDate = this.getLastAttempt(deckID, entryID)?.questioned;

    if (dueDate == null) {
      return null;
    }

    dueDate = new Date(dueDate.getTime());
    const interval = this.scoreSheets.get()[deckID]?.scores[entryID]?.interval!;
    dueDate.setDate(dueDate.getDate() + interval);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate;
  }

  getStep(deckID: string, entryID: string) {
    const dueDate = this.getDueDate(deckID, entryID);
    const today = new Date();

    if (dueDate == null) {
      return Step.New;
    } else if (dueDate < today) {
      return Step.Review;
    } else {
      return Step.Done;
    }
  }

  filterCards(deckID: string, step: Step) {
    return Object.values(this.decks.get()[deckID]?.entries!)
      .filter(((e: DictionaryEntry) => this.getStep(deckID, e.id) == step).bind(this))
      .map(e => e.id);
  }

  initializeSession(deckID: string) {
    let queue = this.filterCards(deckID, Step.Review);
    queue = queue.concat(selectRandomly(this.filterCards(deckID, Step.New), 10));
    shuffle(queue);
    queue.slice(0, 10);
    this.currentSession.set({ deckID, entryQueue: queue });
  }

  startAttempt() {
    const session = this.currentSession.get()!;
    session.questioned = new Date();
    session.answered = undefined;
    this.currentSession.set(session);
  }

  answerAttempt() {
    const session = this.currentSession.get()!;
    session.answered = new Date();
    this.currentSession.set(session);
  }

  gradeAttempt(grade: number) {
    if (!(grade >= 0 && grade <= 3)) {
      throw new Error('Out of bound');
    }

    const session = this.currentSession.get()!;
    const graded = new Date();
    const deckID = session.deckID;
    const entryID = session.entryQueue[0];
    const step = this.getStep(deckID, entryID);

    const scoreSheet = this.scoreSheets.get()[deckID]!;
    scoreSheet.attempts.push({
      id: uuidv4(),
      entryID,
      step,
      grade,
      questioned: session.questioned!,
      answered: session.answered!,
      graded
    });

    if (step != Step.Done) {
      const score = this.scoreSheets.get()[deckID]?.scores[entryID] ?? {
        repetitions: 0,
        easeFactor: 2.5,
        interval: 1,
        id: entryID
      };

      const newScore = scheduler.sm2((3 - grade) * (5 / 3), score);
      this.scoreSheets.get()[deckID]!.scores[entryID] = newScore;
    }

    this.scoreSheets.set(this.scoreSheets.get());
  }

  next() {
    const session = this.currentSession.get()!;
    session.entryQueue.shift();
    this.currentSession.set(session);
  }

  async saveScoreSheet(deckID: string) {
    const scoreSheet = this.scoreSheets.get()[deckID];
    await bridge.writeScoreSheet(deckID, JSON.stringify(scoreSheet));
  }
}

function blankDeck() {
  const now = new Date().toISOString();

  return `<kdml version="0.1">
  <head>
    <title>Untitled</title>
    <description>untitled deck</description>
    <created>${now}</created>
  </head>

  <entries>
  </entries>
</kdml>`;
}

// Fisher–Yates shuffle
export function shuffle(array: any[]) {
  for (let i = array.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

export function selectRandomly(array: any[], max: number) {
  const clone = array.slice();
  shuffle(clone);

  if (max < clone.length) {
    clone.length = max;
  }

  return clone;
}