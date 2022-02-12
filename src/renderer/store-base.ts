export default class StoreBase<T> {
  listeners = [];
  state: T = null;

  constructor(initialState: T) {
    this.state = initialState;
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  unsubscribe(listener) {
    this.listeners.splice(this.listeners.indexOf(listener), 1);
  }

  setState(newState: T) {
    this.state = newState;

    for (const listener of this.listeners) {
      listener();
    }
  }
}