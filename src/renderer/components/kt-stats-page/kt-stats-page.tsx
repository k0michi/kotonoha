import { Component, Host, h, Prop, State } from '@stencil/core';
import { MatchResults, RouterHistory } from '@stencil/router';
import { store } from '../../model';
import { Entry } from '../../interfaces';

@Component({
  tag: 'kt-stats-page',
  styleUrl: 'kt-stats-page.css'
})
export class KtStatsPage {
  @Prop() history: RouterHistory;
  @Prop() match: MatchResults;
  @State() entries: { [key: string]: Entry };
  @State() attemptCounts;
  @State() dueDates;

  async componentWillLoad() {
    await store.initializeDeck(this.match.params.deckID);
    this.mapState();
    store.subscribe(this.mapState.bind(this));
  }

  mapState() {
    this.entries = store.state.deck.entries;
    this.attemptCounts = store.state.deckExtra.attemptCounts;
    this.dueDates = store.state.deckExtra.dueDates;
  }

  render() {
    return (
      <Host>
        <table>
          {Object.values(this.entries).map(e =>
            <tr>
              <td>
                {e.word}
              </td>
              <td>
                {e.id}
              </td>
              <td>
                {e.updatedAt.toLocaleString()}
              </td>
              <td>
                {e.createdAt.toLocaleString()}
              </td>
              <td>
                {this.attemptCounts[e.id]}
              </td>
              <td>
                {this.dueDates[e.id]?.toLocaleString()}
              </td>
            </tr>
          )}
        </table>
      </Host>
    );
  }
}