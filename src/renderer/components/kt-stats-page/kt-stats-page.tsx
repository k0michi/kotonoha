import { Component, Host, h, Prop, State } from '@stencil/core';
import { MatchResults, RouterHistory } from '@stencil/router';
import { Entry, store } from '../../model';

@Component({
  tag: 'kt-stats-page',
  styleUrl: 'kt-stats-page.css'
})
export class KtStatsPage {
  @Prop() history: RouterHistory;
  @Prop() match: MatchResults;
  @State() entries: { [key: string]: Entry };
  @State() attemptCounts;
  @State() latestAttemptDates;

  async componentWillLoad() {
    await store.initializeDeck(this.match.params.deckID);
    this.mapState();
    store.subscribe(this.mapState.bind(this));
  }

  mapState() {
    this.entries = store.state.deck.entries;
    this.attemptCounts = store.state.deckData.attemptCounts;
    this.latestAttemptDates = store.state.deckData.latestAttemptDates;
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
                {this.latestAttemptDates[e.id]?.toLocaleString()}
              </td>
            </tr>
          )}
        </table>
      </Host>
    );
  }
}