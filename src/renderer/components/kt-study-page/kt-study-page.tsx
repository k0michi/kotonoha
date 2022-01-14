import { Component, Host, h, Prop, State, Listen } from '@stencil/core';
import { RouterHistory, MatchResults } from '@stencil/router';
import { store, Deck } from '../../store';
import * as scheduler from '../../scheduler';
import * as utils from '../../utils';

@Component({
  tag: 'kt-study-page',
  styleUrl: 'kt-study-page.css'
})
export class KtStudyPage {
  @Prop() history: RouterHistory;
  @Prop() match: MatchResults;
  deck;
  entries;
  @State() currentEntry;
  @State() showingAnswer = false;
  @State() typedLetters = 0;

  componentWillLoad() {
    this.deck = store.getDeck(this.match.params.deckID);
    this.entries = this.deck.getAllEntries();
    this.currentEntry = this.entries[utils.random(0, this.entries.length)];
  }

  @Listen('keydown', { target: 'window' })
  async handleKeyDown(e: KeyboardEvent) {
    console.log(e)
    if (e.key == 'Escape') {
      this.history.push(`/`, {});
    }

    if (this.showingAnswer) {
      if (e.key >= '1' && e.key <= '4') {
        const grade = parseInt(e.key, 10) - 1;

        const now = new Date();
        this.deck.addAttempt({ word: this.currentEntry.word, grade, date: now });

        const currentScore = this.deck.getScore(this.currentEntry.word) ?? { repetitions: 0, easeFactor: 2.5, interval: 1 };
        const newScore = scheduler.sm2((3 - grade) * (5 / 3), currentScore);
        this.deck.setScore(this.currentEntry.word, newScore);

        await store.saveDeck(this.deck);
        this.entries.splice(this.entries.indexOf(this.currentEntry), 1);

        if (this.entries.length == 0) {
          this.history.push(`/`, {});
        } else {
          this.currentEntry = this.entries[utils.random(0, this.entries.length)];
          this.typedLetters = 0;
          this.showingAnswer = false;
        }
      }
    } else {
      if (e.key == this.currentEntry.word[this.typedLetters]) {
        this.typedLetters++;
      }

      if (e.code == 'Enter' && this.typedLetters == this.currentEntry.word.length) {
        this.showingAnswer = true;
      }
    }
  }

  render() {
    const hue = utils.normalizeEnglishWord(this.currentEntry.word) * 360;
    const letters = [...this.currentEntry.word];

    return (
      <Host>
        <h1>
          {letters.map((l, i) => {
            let style;

            if (i == this.typedLetters) {
              style = { textDecoration: 'underline' };
            } else if (i < this.typedLetters) {
              style = { color: `hsl(${hue}, 100%, 50%)` };
            }

            return <span key={l} style={style}>{l}</span>
          })}
        </h1>
        <div>
          {this.currentEntry.definitions.map((d, i) =>
            <h2>{d.partOfSpeech}{this.showingAnswer ? ` ${d.definition}` : ''}</h2>
          )}
        </div>
      </Host>
    );
  }
}