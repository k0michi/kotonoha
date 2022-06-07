import { Component, Host, h, Prop, State, Listen, Fragment } from '@stencil/core';
import { RouterHistory, MatchResults } from '@stencil/router';
import { store } from '../../model';
import { Entry, QuestionMode } from '../../interfaces';
import * as utils from '../../utils';

@Component({
  tag: 'kt-study-page',
  styleUrl: 'kt-study-page.css'
})
export class KtStudyPage {
  @Prop() history: RouterHistory;
  @Prop() match: MatchResults;
  @State() isPractice: boolean;
  @State() currentEntry: Entry;
  @State() showingAnswer = false;
  @State() typedLetters = 0;
  @State() newCount = 0;
  @State() reviewCount = 0;
  @State() practiceCount = 0;
  listener = this.mapState.bind(this);

  async componentWillLoad() {
    this.isPractice = this.history.location.query.practice == "true" ?? false;

    await store.initializeDeck(this.match.params.deckID);
    store.initializeEntryQueue(this.isPractice);
    // store.initializeDailyCount();
    this.mapState();
    store.subscribe(this.listener);
    this.nextEntry();
  }

  disconnectedCallback() {
    store.unsubscribe(this.listener);
  }

  mapState() {
    this.isPractice = store.state.study.isPractice;
    this.currentEntry = store.state.study.currentEntryID != null ? store.state.deck.entries[store.state.study.currentEntryID] : null;
    this.showingAnswer = store.state.study.showingAnswer;
    this.typedLetters = store.state.study.typedLetters;
    this.newCount = store.state.deckExtra.newCount;
    this.reviewCount = store.state.deckExtra.reviewCount;
    this.practiceCount = store.state.deckExtra.practiceCount;
  }

  quit() {
    this.history.push(`/`, {});
  }

  nextEntry() {
    if (store.queueRemaining() > 0) {
      store.startAttempt(QuestionMode.Meaning);
    } else {
      this.quit();
    }
  }

  async gradeWord(grade) {
    store.gradeAttempt(grade);
    await store.saveCurrentDeck();
    this.nextEntry();
  }

  showAnswer() {
    if (this.typedLetters == this.currentEntry.word.length) {
      store.answerAttempt();
    }
  }

  compare(a, b) {
    // Handle diacritical marks
    return a == b || (a == 'ï' && b == 'i') || (a == 'ç' && b == 'c');
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
      if (this.compare(this.currentEntry.word[this.typedLetters], e.key)) {
        store.addTypedLetters();
      }

      if (e.code == 'Enter') {
        this.showAnswer();
      }
    }
  }

  onClickShow() {
    this.showAnswer();
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
              <div class="definition">
                <div>{d.partOfSpeech}</div>
                <div class={{ "hide-answer": !this.showingAnswer, "gloss": true }}>{Array.isArray(d.gloss) ? d.gloss.map(g => <>{g}<br /></>) : d.gloss}</div>
              </div>
            )}
          </div>
          <div id="buttons">
            {this.showingAnswer ?
              <>
                <button class="grade-0" onClick={this.onClickGrade.bind(this, 0)}>Easy</button>
                <button class="grade-1" onClick={this.onClickGrade.bind(this, 1)}>Good</button>
                <button class="grade-2" onClick={this.onClickGrade.bind(this, 2)}>Hard</button>
                <button class="grade-3" onClick={this.onClickGrade.bind(this, 3)}>Bad</button>
              </> :
              <button class="show" disabled={!canShowAnswer} onClick={this.onClickShow.bind(this)}>Show Answer</button>
            }
          </div>
          <div>{this.newCount} - {this.reviewCount} - {this.practiceCount}</div>
        </div>
      </Host>
    );
  }
}