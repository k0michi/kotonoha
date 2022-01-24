import { Component, Host, h, State, Prop } from '@stencil/core';
import { RouterHistory } from '@stencil/router';
import { store, Deck } from '../../model';

@Component({
  tag: 'kt-index-page',
  styleUrl: 'kt-index-page.css'
})
export class KtIndexPage {
  @Prop() history: RouterHistory;
  @State() deckIndex: { [key: string]: Deck } = {};

  async componentWillLoad() {
    await store.initializeIndex();
    this.mapState();
    store.subscribe(this.mapState.bind(this));
  }

  mapState() {
    this.deckIndex = store.state.deckIndex;
  }

  async onClickNew(e: MouseEvent) {
    store.createNewDeck('Untitled');
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

  onClickStats(deck, e) {
    e.preventDefault();
    this.history.push(`/stats/${deck.id}`, {});
  }

  render() {
    return (
      <Host>
        <button onClick={this.onClickNew.bind(this)}>New</button>
        <ul>
          {Object.values(this.deckIndex).map(v =>
            <li>
              {v.name}
              <button onClick={this.onClickStudy.bind(this, v)}>Study</button>
              <button onClick={this.onClickPractice.bind(this, v)}>Practice</button>
              <button onClick={this.onClickEdit.bind(this, v)}>Edit</button>
              <button onClick={this.onClickStats.bind(this, v)}>Stats</button>
            </li>
          )}
        </ul>
      </Host>
    );
  }
}