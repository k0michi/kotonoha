import * as tspt from './tspt.js';

const definitionExp = /^(n|v|adj|adv|conj|prep|phr)\s+(.+)$/;

export function parse(text) {
  const tree = tspt.parse(text);
  const entries = [];

  for (const c of tree.children) {
    entries.push(parseEntry(c, true));
  }

  return { entries };
}

function parseEntry(node, parseRelated) {
  const word = node.value;
  const definitions = [];
  const related = [];

  for (const c of node.children) {
    const definitionRes = definitionExp.exec(c.value);

    if (definitionRes != null) {
      const partOfSpeech = definitionRes[1];
      let gloss = definitionRes[2];

      if (c.children.length > 0) {
        gloss = [gloss];
        
        for (const d of c.children) {
          gloss.push(d.value);
        }
      }

      definitions.push({ partOfSpeech, gloss });
    } else {
      if (parseRelated) {
        related.push(parseEntry(c, false));
      }
    }
  }

  if (parseRelated) {
    return { word, definitions, related };
  } else {
    return { word, definitions };
  }
}