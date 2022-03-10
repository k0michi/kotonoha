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
  listener = this.mapState.bind(this);

  async componentWillLoad() {
    await store.initializeDeck(this.match.params.deckID);
    this.mapState();
    store.subscribe(this.listener);
  }

  disconnectedCallback() {
    store.unsubscribe(this.listener);
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
          <thead>
            <tr>
              <th>#</th>
              <th>Word</th>
              <th>ID</th>
              <th>Created at</th>
              <th>Updated at</th>
              <th>Attempts</th>
              <th>Due date</th>
            </tr>
          </thead>
          {Object.values(this.entries).map((e, i) =>
            <tr>
              <td>
                {i}
              </td>
              <td>
                {e.word}
              </td>
              <td>
                {e.id}
              </td>
              <td>
                {e.createdAt.toLocaleString()}
              </td>
              <td>
                {e.updatedAt.toLocaleString()}
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