import window from '@k0michi/isomorphic-dom';

export function parseXML(string: string) {
  const parser = new window.DOMParser();
  const $document = parser.parseFromString(string, 'text/xml');

  if ($document.querySelector('parsererror') != null) {
    throw new Error('Failed to parse');
  }

  return $document;
}

export function parseXMLFragment(string: string) {
  const parser = new window.DOMParser();
  string = `<root>${string}</root>`;
  const $document = parser.parseFromString(string, 'text/xml');

  if ($document.querySelector('parsererror') != null) {
    throw new Error('Failed to parse');
  }

  return $document.childNodes;
}

export function serializeXML(document: Document) {
  const serializer = new window.XMLSerializer();
  return serializer.serializeToString(document);
}

export function getTextContent(query: string, $element: Element) {
  if ($element == null) {
    return undefined;
  }

  const $found = $element.querySelector(query);

  if ($found == null) {
    return undefined;
  }

  return $found.textContent!;
}

export function newElementCreator(document: Document) {
  return (type: string, props: Record<string, string> = {}, children?: string) => {
    const $elem = document.createElement(type);

    for (const [key, value] of Object.entries(props)) {
      $elem.setAttribute(key, value);
    }

    if (children != null) {
      $elem.append(children);
    }

    return $elem;
  };
}