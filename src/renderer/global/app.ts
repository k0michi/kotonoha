import {store} from '../store';

export default async () => {
  await store.initialize();
};