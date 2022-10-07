import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import Root from './root';
import Model from './model';
import { ModelProvider } from 'kyoka';
import { HashRouter } from "react-router-dom";

import './style.css';

const model = new Model();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <HashRouter>
    <ModelProvider model={model}>
      <Root />
    </ModelProvider>
  </HashRouter>
);