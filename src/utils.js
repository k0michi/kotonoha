export function removeChildNodes(parent) {
  while (parent.firstChild != null) {
    parent.removeChild(parent.firstChild);
  }
}

export function range(start, end) {
  return Array.from({ length: end - start }, (e, i) => start + i);
}

export function random(start, end) {
  return Math.floor(Math.random() * (end - start)) + start;
}

export function normalizeEnglishWord(word) {
  let value = 0;
  let i = 1;
  const a = 'a'.charCodeAt(0);

  word = word.toLowerCase();

  for (const c of word) {
    if (c >= 'a' && c <= 'z') {
      value += (c.charCodeAt(0) - a) * i / 26;
      i /= 26;
    }
  }

  return value;
}