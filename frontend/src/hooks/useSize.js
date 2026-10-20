// https://www.npmjs.com/package/@react-hook/resize-observer

import useResizeObserver from '@react-hook/resize-observer';
import { useLayoutEffect, useState } from 'react';

const useSize = (target) => {
  const [size, setSize] = useState();

  useLayoutEffect(() => {
    if (!target || !target.current) {
      return;
    }
    setSize(target.current.getBoundingClientRect());
  }, [target]);

  // Where the magic happens
  useResizeObserver(target, (entry) => setSize(entry.contentRect));
  return size;
};

export default useSize;
