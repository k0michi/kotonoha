import * as tspt from './tspt.js';

const definitionExp = /^(n|v|adj|adv|conj|prep)\s+(.+)$/;

export function parse(text) {
  const tree = tspt.parse(text);
  const entries = [];

  for (const c of tree.children) {
    entries.push(parseEntry(c));
  }

  return {entries};
}

function parseEntry(node) {
  const word = node.value;
  const definitions = [];
  const derivatives = [];

  for (const c of node.children) {
    const definitionRes = definitionExp.exec(c.value);

    if (definitionRes != null) {
      const partOfSpeech = definitionRes[1];
      const definition = definitionRes[2];
      definitions.push({partOfSpeech, definition});
    } else {
      derivatives.push(parseEntry(c));
    }
  }

  return {word, definitions, derivatives};
}