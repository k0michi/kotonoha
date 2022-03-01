import { Component, Host, h, Prop, State, Fragment } from '@stencil/core';
import { MatchResults, RouterHistory } from '@stencil/router';
import { store } from '../../model';
import { Entry } from '../../interfaces';
import * as ewl from '../../ewl';

const bridge = globalThis.bridge;

@Component({
  tag: 'kt-edit-page',
  styleUrl: 'kt-edit-page.css'
})
export class KtEditPage {
  @Prop() history: RouterHistory;
  @Prop() match: MatchResults;
  @State() entries: { [key: string]: Entry };
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
  }

  async onChangeName(e) {
    store.setName(e.target.value);
    await store.saveCurrentDeck();
  }

  async onClickImport(e) {
    const file = await bridge.openFile();

    if (file != null) {
      const content = await bridge.readFile(file);

      if (file.endsWith('.json')) {
        const tree = JSON.parse(content);
        store.importDeck(tree);
        await store.saveCurrentDeck();
      } else {
        const tree = ewl.parse(content);
        store.importDeck(tree);
        await store.saveCurrentDeck();
      }
    }
  }

  render() {
    console.log(this.entries)
    return (
      <Host>
        <span>Name:</span><input type="text" onChange={this.onChangeName.bind(this)} value={store.state.deck.name} />
        <button onClick={this.onClickImport.bind(this)}>Import</button>
        <ul>
          {Object.values(this.entries).map(e =>
            <>
              <li key={e.word}>{e.word}</li>
              <ul>
                {e.definitions.map(d =>
                  <li>{d.partOfSpeech} {Array.isArray(d.gloss) ? d.gloss.map(g => <span>{g}<br /></span>) : d.gloss}</li>
                )}
              </ul>
            </>
          )}
        </ul>
      </Host>
    );
  }
}