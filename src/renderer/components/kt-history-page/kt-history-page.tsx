import { Component, Host, h, Prop, State, Fragment } from '@stencil/core';
import { MatchResults, RouterHistory } from '@stencil/router';
import { store } from '../../model';
import { Attempt, Deck, Entry, Step } from '../../interfaces';

@Component({
  tag: 'kt-history-page',
  styleUrl: 'kt-history-page.css'
})
export class KtHistoryPage {
  @Prop() history: RouterHistory;
  @Prop() match: MatchResults;
  @State() entries: { [key: string]: Entry };
  @State() attempts: Attempt[];
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
    this.attempts = store.state.deck.attempts;
  }

  stepToString(step: Step) {
    switch (step) {
      case Step.New:
        return 'New';
      case Step.Practice:
        return 'Practice';
      case Step.Review:
        return 'Review';
    }
  }

  render() {
    return (
      <Host>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Word</th>
              <th>Date</th>
              <th>Step</th>
              <th>Grade</th>
            </tr>
          </thead>
          {this.attempts.slice().reverse().map((a, i) => {
            const entry = this.entries[a.entryID];

            return (
              <tr>
                <td>
                  {a.id}
                </td>
                <td>
                  {entry.word}
                </td>
                <td>
                  {a.gradedAt.toLocaleString()}
                </td>
                <td>
                  {this.stepToString(a.step)}
                </td>
                <td>
                  {a.grade}
                </td>
              </tr>
            );
          })}
        </table>
      </Host>
    );
  }
}