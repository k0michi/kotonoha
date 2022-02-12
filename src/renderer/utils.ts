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

const timestampExp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function parseJSON(json) {
  return JSON.parse(json, (key, value) => {
    if (typeof value == 'string' && timestampExp.test(value)) {
      return new Date(value);
    } else {
      return value;
    }
  });
}

// Fisher–Yates shuffle
export function shuffle(array) {
  for (let i = array.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

export function selectRandom(array, count) {
  const clone = array.slice();
  shuffle(clone);
  clone.length = count;
  return clone;
}