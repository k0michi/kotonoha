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

      const deck = createDeck(id, id, tree.entries);
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

  const indices = utils.range(0, deck.entries.length);
  let currentIndex = indices[Math.floor(Math.random() * indices.length)];
  let currentEntry = deck.entries[currentIndex];
  let showingDef = false;
  let typed = 0;

  view.headword = document.createElement('h1');
  root.appendChild(view.headword);
  headwordView(currentEntry, typed);

  view.definitionList = document.createElement('div');
  root.appendChild(view.definitionList);
  definitionListView(currentEntry, false);

  let listener;
  document.addEventListener('keydown', listener = e => {
    if (showingDef) {
      if (e.key >= '1' && e.key <= '4') {
        const grade = parseInt(e.key, 10) - 1;

        const now = new Date();
        deck.attempts.push({ entry: currentIndex, grade, date: now });
        let score = deck.scores[currentIndex] ?? { repetitions: 0, easeFactor: 2.5, interval: 1 };
        score = scheduler.sm2((3 - grade) * (5 / 3), score);
        deck.scores[currentIndex] = score;
        saveDeck(deck);

        indices.splice(indices.indexOf(currentIndex), 1);

        if (indices.length == 0) {
          document.removeEventListener('keydown', listener);
          indexView();
        } else {
          currentIndex = indices[Math.floor(Math.random() * indices.length)];
          currentEntry = deck.entries[currentIndex];
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

  for (let i = 0; i < entry.word.length; i++) {
    const c = entry.word[i];
    const wrapper = document.createElement('span');

    if (i < typed) {
      wrapper.style.color = 'red';
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

function createDeck(id, name, entries) {
  const now = new Date();

  return {
    id,
    name,
    createdAt: now,
    entries,
    attempts: [],
    scores: []
  };
}

async function loadDeck(file) {
  const id = bridge.path.basename(file, bridge.path.extname(file));
  const content = await bridge.readFile(file);
  const tree = JSON.parse(content);

  return tree;
}

async function saveDeck(deck) {
  const deckJSON = JSON.stringify(deck);

  await bridge.makeDir(config.decksPath);
  await bridge.saveFile(bridge.path.format({
    dir: config.decksPath,
    name: deck.id,
    ext: '.json'
  }), deckJSON);
}