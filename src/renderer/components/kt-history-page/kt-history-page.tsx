import { Component, Host, h, Prop, State, Fragment } from '@stencil/core';
import { MatchResults, RouterHistory } from '@stencil/router';
import { store } from '../../model';
import { Attempt, Deck, Entry } from '../../interfaces';

@Component({
  tag: 'kt-history-page',
  styleUrl: 'kt-history-page.css'
})
export class KtHistoryPage {
  @Prop() history: RouterHistory;
  @Prop() match: MatchResults;
  @State() entries: { [key: string]: Entry };
  @State() attempts: Attempt[];

  async componentWillLoad() {
    await store.initializeDeck(this.match.params.deckID);
    this.mapState();
    store.subscribe(this.mapState.bind(this));
  }

  mapState() {
    this.entries = store.state.deck.entries;
    this.attempts = store.state.deck.attempts;
  }

  render() {
    return (
      <Host>
        <table>
          {this.attempts.slice().reverse().map((a, i) => {
            const entry = this.entries[a.entryID];

            return (
              <tr>
                <td>
                  #{a.id}
                </td>
                <td>
                  {entry.word}
                </td>
                <td>
                  {a.gradedAt.toLocaleString()}
                </td>
                <td>
                  {a.step}
                </td>
              </tr>
            );
          })}
        </table>
      </Host>
    );
  }
}