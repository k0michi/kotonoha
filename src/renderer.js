import * as ewl from './ewl';
import * as scheduler from './scheduler';
import * as utils from './utils';

const view = {};
const decks = [];
let config;

window.addEventListener('load', async () => {
  await initialize();
  indexView();
});

async function initialize() {
  config = await bridge.getConfig();
  const deckFiles = await bridge.readDir(config.decksPath);

  if (deckFiles != null) {
    for (const deckFile of deckFiles) {
      const deck = await loadDeck(deckFile);
      addDeck(deck);
    }
  }
}

function indexView() {
  utils.removeChildNodes(root);
  view.root = document.getElementById('root');

  const openButton = document.createElement('button');
  openButton.textContent = 'Open';
  view.root.appendChild(openButton);

  openButton.addEventListener('click', async () => {
    const file = await bridge.openFile();

    if (file != null) {
      const id = bridge.path.basename(file, bridge.path.extname(file));
      const content = await bridge.readFile(file);
      const tree = ewl.parse(content);

      const deck = new Deck(id, id, tree.entries);
      addDeck(deck);
      await saveDeck(deck);
    }
  });

  view.decks = document.createElement('ul');
  view.root.appendChild(view.decks);

  for (const deck of decks) {
    const anchor = document.createElement('a');
    anchor.href = '';
    anchor.textContent = deck.id;

    anchor.addEventListener('click', e => {
      e.preventDefault();
      practiceView(deck);
    });

    view.decks.appendChild(anchor);
  }
}

function practiceView(deck) {
  utils.removeChildNodes(root);

  const entries = deck.getAllEntries();
  let currentEntry = entries[utils.random(0, entries.length)];
  let showingDef = false;
  let typed = 0;

  view.headword = document.createElement('h1');
  root.appendChild(view.headword);
  headwordView(currentEntry, typed);

  view.definitionList = document.createElement('div');
  root.appendChild(view.definitionList);
  definitionListView(currentEntry, false);

  let listener;
  document.addEventListener('keydown', listener = async e => {
    if (e.key == 'Escape') {
      document.removeEventListener('keydown', listener);
      indexView();
    }

    if (showingDef) {
      if (e.key >= '1' && e.key <= '4') {
        const grade = parseInt(e.key, 10) - 1;

        const now = new Date();
        deck.addAttempt({ word: currentEntry.word, grade, date: now });

        const currentScore = deck.getScore(currentEntry.word) ?? { repetitions: 0, easeFactor: 2.5, interval: 1 };
        const newScore = scheduler.sm2((3 - grade) * (5 / 3), currentScore);
        deck.setScore(currentEntry.word, newScore);

        await saveDeck(deck);
        entries.splice(entries.indexOf(currentEntry), 1);

        if (entries.length == 0) {
          document.removeEventListener('keydown', listener);
          indexView();
        } else {
          currentEntry = entries[utils.random(0, entries.length)];
          typed = 0;
          showingDef = false;
          headwordView(currentEntry, typed);
          definitionListView(currentEntry, showingDef);
        }
      }
    } else {
      if (e.key == currentEntry.word[typed]) {
        typed++;
        headwordView(currentEntry, typed);
      }

      if (e.code == 'Enter' && typed == currentEntry.word.length) {
        showingDef = true;
        definitionListView(currentEntry, showingDef);
      }
    }
  });
}

function headwordView(entry, typed) {
  utils.removeChildNodes(view.headword);
  const hue = utils.normalizeEnglishWord(entry.word) * 360;

  for (let i = 0; i < entry.word.length; i++) {
    const c = entry.word[i];
    const wrapper = document.createElement('span');

    if (i < typed) {
      wrapper.style.color = `hsl(${hue}, 100%, 50%)`;
    }

    if (i == typed) {
      wrapper.style.textDecoration = 'underline';
    }

    wrapper.textContent = c;
    view.headword.appendChild(wrapper);
  }
}

function definitionListView(entry, showDef) {
  utils.removeChildNodes(view.definitionList);

  for (const def of entry.definitions) {
    const defView = document.createElement('h2');

    if (showDef) {
      defView.textContent = `${def.partOfSpeech} ${def.definition}`;
    } else {
      defView.textContent = `${def.partOfSpeech}`;
    }

    view.definitionList.appendChild(defView);
  }
}

function addDeck(deck) {
  decks.push(deck);
}

const timestampExp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

class Deck {
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

  setScore(word, score) {
    this.scores[word] = score;
  }

  addAttempt(attempt) {
    this.attempts.push(attempt);
  }

  static fromJSON(json) {
    const parsed = JSON.parse(json, (key, value) => {
      if (typeof value == 'string' && timestampExp.test(value)) {
        return new Date(value);
      } else {
        return value;
      }
    });

    const deck = new Deck(parsed.id, parsed.name, parsed.entries, parsed.createdAt, parsed.attempts, parsed.scores);
    return deck;
  }

  toJSON() {
    const object = { id: this.id, name: this.name, entries: this.entries, createdAt: this.createdAt, attempts: this.attempts, scores: this.scores };
    return JSON.stringify(object);
  }
}

async function loadDeck(file) {
  const id = bridge.path.basename(file, bridge.path.extname(file));
  const content = await bridge.readFile(file);
  const deck = Deck.fromJSON(content);
  return deck;
}

async function saveDeck(deck) {
  const json = deck.toJSON();

  await bridge.makeDir(config.decksPath);
  await bridge.saveFile(bridge.path.format({
    dir: config.decksPath,
    name: deck.id,
    ext: '.json'
  }), json);
}