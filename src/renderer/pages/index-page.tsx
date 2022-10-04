import { useModel, useObservable } from 'kyoka';
import * as React from 'react';
import { Link } from 'react-router-dom';
import Model from '../model';

export default function IndexPage() {
  const model = useModel<Model>();
  const deckIndex = useObservable(model.deckIndex);

  React.useEffect(() => {
    (async () => {
      await model.loadDeckIndex();
    })();
  }, []);

  return (
    <>
      <button onClick={async e => {
        await model.createNewDeck();
        await model.loadDeckIndex();
      }}>New</button>
      <ul>
        {
          deckIndex.map(d => <li key={d.id}>
            <Link to={`/study/${d.id}`}>{d.title}</Link>{' '}
            <Link to={`/edit/${d.id}`}>edit</Link>
          </li>)
        }
      </ul>
    </>
  );
}