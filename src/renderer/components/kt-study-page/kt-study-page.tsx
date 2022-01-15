import { Component, Host, h, Prop, State, Listen, Fragment } from '@stencil/core';
import { RouterHistory, MatchResults } from '@stencil/router';
import { store, Deck, Attempt } from '../../store';
import * as scheduler from '../../scheduler';
import * as utils from '../../utils';

@Component({
  tag: 'kt-study-page',
  styleUrl: 'kt-study-page.css'
})
export class KtStudyPage {
  @Prop() history: RouterHistory;
  @Prop() match: MatchResults;
  deck: Deck;
  entries;
  attemptID: number;
  @State() isPractice;
  @State() currentEntry;
  @State() showingAnswer = false;
  @State() typedLetters = 0;

  componentWillLoad() {
    this.isPractice = this.history.location.query.practice ?? false;
    this.deck = store.getDeck(this.match.params.deckID);

    console.log(this.deck.entries);
    console.log(this.deck.getPracticeCards());
    console.log(this.deck.getNewCards());
    console.log(this.deck.getReviewCards());

    if (this.isPractice) {
      this.entries = this.deck.getPracticeCards();
    } else {
      this.entries = this.deck.getNewCards();
      this.entries = this.entries.concat(this.deck.getReviewCards());
    }

    this.currentEntry = this.entries[utils.random(0, this.entries.length)];
  }

  componentDidRender() {
    if (this.attemptID == null) {
      this.attemptID = this.deck.startAttempt(this.currentEntry.id);
    }
  }

  quit() {
    this.history.push(`/`, {});
  }

  async gradeWord(grade) {
    this.deck.gradeAttempt(this.attemptID, grade);

    const currentScore = this.deck.getScore(this.currentEntry.id);
    const newScore = scheduler.sm2((3 - grade) * (5 / 3), currentScore);
    this.deck.setScore(this.currentEntry.id, newScore);

    await store.saveDeck(this.deck);
    this.entries.splice(this.entries.indexOf(this.currentEntry), 1);

    if (this.entries.length == 0) {
      this.quit();
    } else {
      this.currentEntry = this.entries[utils.random(0, this.entries.length)];
      this.typedLetters = 0;
      this.showingAnswer = false;
      this.attemptID = this.deck.startAttempt(this.currentEntry.id);
    }
  }

  async showAnswer() {
    if (this.typedLetters == this.currentEntry.word.length) {
      this.showingAnswer = true;
      this.deck.answerAttempt(this.attemptID);
    }
  }

  @Listen('keydown', { target: 'window' })
  async handleKeyDown(e: KeyboardEvent) {
    if (e.key == 'Escape') {
      this.quit();
    }

    if (this.showingAnswer) {
      if (e.key >= '1' && e.key <= '4') {
        const grade = parseInt(e.key, 10) - 1;
        await this.gradeWord(grade);
      }
    } else {
      if (e.key == this.currentEntry.word[this.typedLetters]) {
        this.typedLetters++;
      }

      if (e.code == 'Enter') {
        await this.showAnswer();
      }
    }
  }

  async onClickShow() {
    await this.showAnswer();
  }

  async onClickGrade(grade) {
    await this.gradeWord(grade);
  }

  render() {
    const hue = utils.normalizeEnglishWord(this.currentEntry.word) * 360;
    const letters = [...this.currentEntry.word];
    const canShowAnswer = this.typedLetters == this.currentEntry.word.length;

    return (
      <Host>
        <div id="container">
          <h1 id="headword">
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
          <div id="definition-list">
            {this.currentEntry.definitions.map((d, i) =>
              <h2><span>{d.partOfSpeech}</span><span style={this.showingAnswer ? {} : { color: 'transparent', userSelect: 'none' }}> {d.definition}</span></h2>
            )}
          </div>
          <div id="buttons">
            {this.showingAnswer ?
              <>
                <button class="grade-0" onClick={this.onClickGrade.bind(this, 0)}>Very Easy</button>
                <button class="grade-1" onClick={this.onClickGrade.bind(this, 1)}>Easy</button>
                <button class="grade-2" onClick={this.onClickGrade.bind(this, 2)}>Hard</button>
                <button class="grade-3" onClick={this.onClickGrade.bind(this, 3)}>Very Hard</button>
              </> :
              <button class="show" disabled={!canShowAnswer} onClick={this.onClickShow.bind(this)}>Show Answer</button>
            }
          </div>
        </div>
      </Host>
    );
  }
}