import { Component, Host, h, Prop, State } from '@stencil/core';
import { MatchResults, RouterHistory } from '@stencil/router';
import { Deck, store } from '../../store';

@Component({
  tag: 'kt-edit-page',
  styleUrl: 'kt-edit-page.css'
})
export class KtEditPage {
  @Prop() history: RouterHistory;
  @Prop() match: MatchResults;
  deck: Deck;
  @State() entries;

  update() {
    this.entries = this.deck.getAllEntries().map(e => {
      return { word: e.word };
    });
  }

  componentWillLoad() {
    this.deck = store.getDeck(this.match.params.deckID);
    this.update();

    this.deck.on('change', (() => {
      this.update();
    }).bind(this));
  }

  async onChangeName(e) {
    this.deck.setName(e.target.value);
    await store.saveDeck(this.deck);
  }

  render() {
    return (
      <Host>
        <span>Name:</span><input type="text" onChange={this.onChangeName.bind(this)} value={this.deck.name} />
        <ul>
          {this.entries.map(e =>
            <li key={e.word}>{e.word}</li>
          )}
        </ul>
      </Host>
    );
  }
}