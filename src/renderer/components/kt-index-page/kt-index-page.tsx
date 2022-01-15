import { Component, Host, h, State, Prop } from '@stencil/core';
import { RouterHistory } from '@stencil/router';
import { store, Deck } from '../../store';

const bridge = globalThis.bridge;

@Component({
  tag: 'kt-index-page',
  styleUrl: 'kt-index-page.css'
})
export class KtIndexPage {
  @Prop() history: RouterHistory;
  @State() decks: any[];

  updateDecks() {
    const decks = store.getDecks();
    this.decks = Object.entries(decks).map(([_, value]) => {
      return { id: (value as any).id, name: (value as any).name };
    });
  }

  async componentWillLoad() {
    await store.initialize();
    this.updateDecks();

    store.on('change', (() => {
      this.updateDecks();
    }).bind(this));
  }

  async onClickNew(e: MouseEvent) {
    const deck = store.newDeck('Untitled');
    await store.saveDeck(deck);
  }

  onClickStudy(deck, e) {
    e.preventDefault();
    this.history.push(`/study/${deck.id}`, {});
  }

  onClickPractice(deck, e) {
    e.preventDefault();
    this.history.push(`/study/${deck.id}?practice=true`, {});
  }

  onClickEdit(deck, e) {
    e.preventDefault();
    this.history.push(`/edit/${deck.id}`, {});
  }

  render() {
    return (
      <Host>
        <button onClick={this.onClickNew.bind(this)}>New</button>
        <ul>
          {this.decks.map(v =>
            <li>
              {v.name}
              <button onClick={this.onClickStudy.bind(this, v)}>Study</button>
              <button onClick={this.onClickPractice.bind(this, v)}>Practice</button>
              <button onClick={this.onClickEdit.bind(this, v)}>Edit</button>
            </li>
          )}
        </ul>
      </Host>
    );
  }
}