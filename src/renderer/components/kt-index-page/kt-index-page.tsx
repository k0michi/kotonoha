import { Component, Host, h, State, Prop } from '@stencil/core';
import { RouterHistory } from '@stencil/router';
import { store } from '../../model';
import { Deck } from '../../interfaces';

@Component({
  tag: 'kt-index-page',
  styleUrl: 'kt-index-page.css'
})
export class KtIndexPage {
  @Prop() history: RouterHistory;
  @State() deckIndex: { [key: string]: Deck } = {};
  listener = this.mapState.bind(this);

  async componentWillLoad() {
    await store.initializeIndex();
    this.mapState();
    store.subscribe(this.listener);
  }

  disconnectedCallback() {
    store.unsubscribe(this.listener);
  }

  mapState() {
    this.deckIndex = store.state.deckIndex;
  }

  onClickNew(e: MouseEvent) {
    store.createNewDeck('Untitled');
  }

  render() {
    return (
      <Host>
        <button onClick={this.onClickNew.bind(this)}>New</button>
        <ul>
          {Object.values(this.deckIndex).map(v =>
            <li>
              {v.name}
              <stencil-route-link url={`/study/${v.id}`}>Study</stencil-route-link>
              <stencil-route-link url={`/study/${v.id}?practice=true`}>Practice</stencil-route-link>
              <stencil-route-link url={`/edit/${v.id}`}>Edit</stencil-route-link>
              <stencil-route-link url={`/stats/${v.id}`}>Stats</stencil-route-link>
              <stencil-route-link url={`/history/${v.id}`}>History</stencil-route-link>
            </li>
          )}
        </ul>
      </Host>
    );
  }
}