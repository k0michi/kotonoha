import { DictionaryEntry, DictionaryHead, DictionarySense } from './dictionary.js';
import { getTextContent, newElementCreator } from './xml.js';
import { v4 as uuidv4 } from 'uuid';

export function assignIDs($document: Document) {
  let xmlEdited = false;
  const $entries = $document.querySelector('entries')!;
  const create = newElementCreator($document);

  for (const $entry of $entries.children) {
    const $id = $entry.querySelector('id');

    if ($id == null) {
      const indent = getIndent($entry) ?? '';
      const $after = $entry.firstChild;
      $entry.insertBefore($document.createTextNode(indent), $after);
      $entry.insertBefore(create('id', {}, uuidv4()), $after);
      xmlEdited = true;
    }
  }

  return xmlEdited;
}

export function getIndent($elem: Element) {
  // The first node of element is considered to be the indent
  const $first = $elem.firstChild;

  if ($first?.nodeType == window.Node.TEXT_NODE) {
    const data = ($first as Text).data;

    if (data.trim() == '') {
      return data;
    }
  }

  return null;
}

export function convertHead($document: Document): DictionaryHead {
  const $head = $document.querySelector('head') as Element;
  const title = getTextContent('title', $head)!;
  const description = getTextContent('description', $head)!;
  const created = getTextContent('created', $head)!;
  return { title, description, created };
}

export function convertEntries($document: Document): Record<string, DictionaryEntry> {
  const $entries = $document.querySelector('entries')!;
  const entries: Record<string, DictionaryEntry> = {};

  for (const $entry of $entries.children) {
    const word = $entry.querySelector('word')?.textContent;
    const id = $entry.querySelector('id')?.textContent;
    const senses: DictionarySense[] = [];

    if (word == null) {
      throw new Error("<entry> must have <word>");
    }

    if (id == null) {
      throw new Error("<entry> must have <id>");
    }

    const $senses = $entry.querySelector('senses');

    if ($senses == null) {
      throw new Error("<entry> must have <senses>");
    }

    for (const $sense of $senses.children) {
      let pos = $sense.querySelector('pos')?.textContent;
      let usage = $sense.querySelector('usage')?.innerHTML;
      const gloss = $sense.querySelector('gloss')?.innerHTML;

      if (pos === null) {
        pos = undefined;
      }

      if (usage === null) {
        usage = undefined;
      }

      if (gloss == null) {
        throw new Error("<sense> must have <gloss>");
      }

      senses.push({ pos, usage, gloss });
    }

    entries[id] = { word, senses, id };
  }

  return entries;
}