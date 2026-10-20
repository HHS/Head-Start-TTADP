import 'react-app-polyfill/stable';

// fbjs/draft-js dependencies reference Node-style `global`.
if (typeof window.global === 'undefined') {
  window.global = window;
}

if (typeof window.setImmediate !== 'function') {
  window.setImmediate = (callback, ...args) => window.setTimeout(callback, 0, ...args);
}

if (typeof window.clearImmediate !== 'function') {
  window.clearImmediate = (handle) => window.clearTimeout(handle);
}
