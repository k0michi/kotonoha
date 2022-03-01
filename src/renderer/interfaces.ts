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
  gloss: string | [string];
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