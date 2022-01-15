import { Component, Host, h, Prop } from '@stencil/core';
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
  @Prop() entries;

  componentWillLoad() {
    this.deck = store.getDeck(this.match.params.deckID);
    this.entries = this.deck.getAllEntries().map(e => {
      return { word: e.word };
    });
  }

  render() {
    return (
      <Host>
        <ul>
          {this.entries.map(e =>
            <li key={e.word}>{e.word}</li>
          )}
        </ul>
      </Host>
    );
  }
}