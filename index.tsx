import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';
import LookaheadReviewDemoPage from './src/demo/pages/lookahead-review';
import CommitmentStatusDemoPage from './src/demo/pages/commitment-status-demo';
import InReviewAppDemo from './src/demo/pages/in-review-app-demo';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const pathname = window.location.pathname || '';
const isInReviewDemo          = pathname.startsWith('/demo/in-review');
const isCommitmentStatusDemo  = pathname.startsWith('/demo/commitment-status');
const isLookaheadDemo         = pathname.startsWith('/demo/lookahead-review');

root.render(
  <React.StrictMode>
    {isInReviewDemo         ? <InReviewAppDemo /> :
     isCommitmentStatusDemo ? <CommitmentStatusDemoPage /> :
     isLookaheadDemo        ? <LookaheadReviewDemoPage /> :
     <App />}
  </React.StrictMode>
);