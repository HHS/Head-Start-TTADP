import { useEffect } from 'react';

/**
 * Adds spellcheck="true" to a given DOM element
 * @param {String} id the id of the dom element
 */
export default function useSpellCheck(id) {
  useEffect(() => {
    const input = document.querySelector(`#${id}`);
    if (input) {
      input.setAttribute('spellcheck', 'true');
    }
  });
}
