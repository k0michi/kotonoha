import { Component, Host, h, Prop, State, Fragment } from '@stencil/core';
import { MatchResults, RouterHistory } from '@stencil/router';
import { Deck, store } from '../../store';
import * as ewl from '../../ewl';

const bridge = globalThis.bridge;

@Component({
  tag: 'kt-edit-page',
  styleUrl: 'kt-edit-page.css'
})
export class KtEditPage {
  @Prop() history: RouterHistory;
  @Prop() match: MatchResults;
  deck: Deck;
  @State() entries: { [key: string]: any };

  update() {
    this.entries = this.deck.entries;
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

  async onClickImport(e) {
    const file = await bridge.openFile();

    if (file != null) {
      const content = await bridge.readFile(file);
      const tree = ewl.parse(content);

      for (const e of tree.entries) {
        for (const d of e.derivatives) {
          this.deck.addEntry(d);
        }

        delete e.derivatives;
        this.deck.addEntry(e);
      }

      await store.saveDeck(this.deck);
    }
  }

  render() {
    return (
      <Host>
        <span>Name:</span><input type="text" onChange={this.onChangeName.bind(this)} value={this.deck.name} />
        <button onClick={this.onClickImport.bind(this)}>Import</button>
        <ul>
          {Object.values(this.entries).map(e =>
            <>
              <li key={e.word}>{e.word}</li>
              <ul>
                {e.definitions.map(d =>
                  <li>{d.partOfSpeech} {d.definition}</li>
                )}
              </ul>
            </>
          )}
        </ul>
      </Host>
    );
  }
}