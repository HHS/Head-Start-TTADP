// This is a test file so ignore eslint error about packages
// being in dev dependencies instead of dependencies

/* eslint-disable import/no-extraneous-dependencies */

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';
import 'whatwg-fetch';
// See https://github.com/testing-library/dom-testing-library/releases/tag/v7.0.0
// 'MutationObserver shim removed'
import MutationObserver from '@sheerun/mutationobserver-shim';

import '@trussworks/react-uswds/lib/uswds.css';
import '@trussworks/react-uswds/lib/index.css';

// See https://github.com/plotly/react-plotly.js/issues/115
window.URL.createObjectURL = () => {};
process.env.REACT_APP_WEBSOCKET_URL = 'wss://localhost';
process.env.REACT_APP_INACTIVE_MODAL_TIMEOUT = '1800000';
process.env.REACT_APP_SESSION_TIMEOUT = '3600000';

window.MutationObserver = MutationObserver;
jest.setTimeout(50000);

// mock scrollTo as it's not implemented in JSDOM (and needed by Routes.js tests)
document.documentElement.scrollTo = jest.fn();

afterEach(() => {
  if (global.gc) global.gc();
});
