export function removeChildNodes(parent) {
  while (parent.firstChild != null) {
    parent.removeChild(parent.firstChild);
  }
}

export function range(start, end) {
  return Array.from({ length: end - start }, (e, i) => start + i);
}