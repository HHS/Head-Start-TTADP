// This is a test file so ignore eslint error about packages
// being in dev dependencies instead of dependencies

/* eslint-disable import/no-extraneous-dependencies */

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';
import 'react-dates/initialize';
// See https://github.com/testing-library/dom-testing-library/releases/tag/v7.0.0
// 'MutationObserver shim removed'
import MutationObserver from '@sheerun/mutationobserver-shim';

window.MutationObserver = MutationObserver;
