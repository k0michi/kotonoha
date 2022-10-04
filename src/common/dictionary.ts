export interface DictionaryHead {
  title: string;
  created: string;
  description: string;
  id?: string;
}

export interface Dictionary {
  head: DictionaryHead;
  entries: Record<string, DictionaryEntry>;
}

export interface DictionaryEntry {
  word: string;
  senses: DictionarySense[];
  id: string;
}

export interface DictionarySense {
  pos?: string;
  usage?: string;
  gloss: string;
}