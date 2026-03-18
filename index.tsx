import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';
import LookaheadReviewDemoPage from './src/demo/pages/lookahead-review';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const pathname = window.location.pathname || '';
const isLookaheadDemo = pathname.startsWith('/demo/lookahead-review');

root.render(
  <React.StrictMode>
    {isLookaheadDemo ? <LookaheadReviewDemoPage /> : <App />}
  </React.StrictMode>
);