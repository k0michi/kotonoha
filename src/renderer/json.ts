import { parseJSON as parseDate } from 'date-fns';

// FIXME: This function parses every date-looking strings. This function may not handle user-inputted strings correctly.
export function parseJSON(json: string) {
  return JSON.parse(json, (key, value) => {
    if (typeof value == 'string') {
      const date = parseDate(value);

      if (!isNaN(date.getTime())) {
        return new Date(value);
      }
    }

    return value;
  });
}