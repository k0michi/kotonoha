import { Component, Host, h, State, Prop } from '@stencil/core';
import { RouterHistory } from '@stencil/router';
import { store, Deck } from '../../store';
import * as ewl from '../../ewl';

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

  onClickDeck(deck, e) {
    e.preventDefault();
    this.history.push(`/study/${deck.id}`, {});
  }

  onClickEdit(deck, e) {
    this.history.push(`/edit/${deck.id}`, {});
  }

  render() {
    return (
      <Host>
        <button onClick={this.onClickNew.bind(this)}>New</button>
        <ul>
          {this.decks.map(v =>
            <li>
              <a key={v.id} href="" onClick={this.onClickDeck.bind(this, v)}>{v.name}</a>
              <button onClick={this.onClickEdit.bind(this, v)}>Edit</button>
            </li>
          )}
        </ul>
      </Host>
    );
  }
}