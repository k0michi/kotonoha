import { useModel, useObservable } from 'kyoka';
import * as React from 'react';
import { useParams } from 'react-router';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router';
import Model from '../model';

export default function StudyPage() {
  const params = useParams();
  const deckID = params['id']!;
  const model = useModel<Model>();
  const navigate = useNavigate();

  const quit = () => {
    navigate('/');
  };

  React.useEffect(() => {
    (async () => {
      await model.loadDeck(deckID);
      await model.loadScoreSheet(deckID);
      model.initializeSession(deckID);
      model.startAttempt();
    })();

    const onKeydown = (e: KeyboardEvent) => {
      const hasAnswered = model.currentSession.get()?.answered != null;

      if (hasAnswered) {
        if (e.key >= '1' && e.key <= '4') {
          const grade = parseInt(e.key, 10) - 1;
          onGraded(grade);
        }
      } else {
        if (e.code == 'Space' || e.code == 'Enter') {
          model.answerAttempt();
        }
      }

      if (e.key == 'Escape') {
        quit();
      }
    };

    window.addEventListener('keydown', onKeydown);

    return () => {
      model.unloadDeck(deckID);
      window.removeEventListener('keydown', onKeydown);
    };
  }, []);

  const onGraded = async (grade: number) => {
    model.gradeAttempt(grade);
    await model.saveScoreSheet(deckID);
    const session = model.currentSession.get();

    if (session != null && session.entryQueue.length > 1) {
      model.next();
      model.startAttempt();
    } else {
      quit();
    }
  };

  const deck = useObservable(model.decks)[deckID];
  const session = useObservable(model.currentSession);
  const currentEntryID = session?.entryQueue[0];
  const entry = currentEntryID != null ? deck?.entries[currentEntryID] : null;
  const hasAnswered = session?.answered != null;

  return (
    <div id="study-page">
      <div><Link to="/">Back</Link></div>
      <div className="headword">{entry?.word}</div>
      <ul className="senses">{entry?.senses.map((s, i) => <li key={i}>{s.pos}. {s.usage} <span className={hasAnswered ? '' : 'hidden'}>{s.gloss}</span></li>)}</ul>
      <div className="buttons">
        {
          hasAnswered ?
            <>
              <button className='grade-0' onClick={e => onGraded(0)}>Easy</button>
              <button className='grade-1' onClick={e => onGraded(1)}>Normal</button>
              <button className='grade-2' onClick={e => onGraded(2)}>Hard</button>
              <button className='grade-3' onClick={e => onGraded(3)}>Again</button>
            </> :
            <button className='answer' onClick={e => {
              model.answerAttempt();
            }}>Answer</button>
        }
      </div>
    </div>
  );
}