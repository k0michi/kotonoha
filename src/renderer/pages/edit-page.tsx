import { useModel, useObservable } from 'kyoka';
import * as React from 'react';
import { useParams } from 'react-router';
import { Link } from 'react-router-dom';
import Model from '../model';

export default function EditPage() {
  const params = useParams();
  const id = params['id']!;
  const model = useModel<Model>();
  const deck = useObservable(model.decks)[id];

  React.useEffect(() => {
    (async () => {
      await model.loadDeck(id);
    })();

    return () => {
      model.unloadDeck(id);
    };
  }, []);

  return (
    <>
      <div><Link to="/">Back</Link></div>
      <div>ID: {deck?.head?.id}</div>
      <div>Title: {deck?.head?.title}</div>
      <div>Description: {deck?.head?.description}</div>
      <div>Created: {deck?.head?.created}</div>
      <ul>
        {deck != null ?Object.values(deck.entries).map(e => <li>
          {e.word}
          <ul>
            {e.senses.map(s =>
              <li>{s.pos}. {s.usage} {s.gloss}</li>
            )}
          </ul>
        </li>) : null}
      </ul>
    </>
  );
}