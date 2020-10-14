// Disable prefer default export, this file will probably accumulate additional
// custom hooks at some point
/* eslint-disable import/prefer-default-export */
// See https://reactjs.org/docs/hooks-faq.html#how-to-get-the-previous-props-or-state
import { useEffect, useRef } from 'react';

export function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}
