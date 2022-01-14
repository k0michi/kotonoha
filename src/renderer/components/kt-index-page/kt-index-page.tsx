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
      return { id: (value as any).id };
    });
  }

  componentWillLoad() {
    this.updateDecks();
  }

  async openButtonClick(e: MouseEvent) {
    const file = await bridge.openFile();

    if (file != null) {
      const id = bridge.path.basename(file, bridge.path.extname(file));
      const content = await bridge.readFile(file);
      const tree = ewl.parse(content);

      const deck = new Deck(id, id, tree.entries);
      await store.saveDeck(deck);
      store.addDeck(deck);
      this.updateDecks();
    }
  }

  deckClick(deck, e) {
    e.preventDefault();
    this.history.push(`/study/${deck.id}`, {});
  }

  render() {
    return (
      <Host>
        <button onClick={this.openButtonClick.bind(this)}>Open</button>
        <ul>
          {this.decks.map(v => <a key={v.id} href="" onClick={this.deckClick.bind(this, v)}>{v.id}</a>)}
        </ul>
      </Host>
    );
  }
}