// https://en.wikipedia.org/wiki/SuperMemo#Description_of_SM-2_algorithm
export function sm2(grade, { repetitions, easeFactor, interval, id }) {
  if (grade >= 3) {
    if (repetitions == 0) {
      interval = 1;
    } else if (repetitions == 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }

    repetitions++;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor += (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));

  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  return { repetitions, easeFactor, interval, id };
}