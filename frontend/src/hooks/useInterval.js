import { useEffect, useRef } from 'react';

export default function useInterval(callback, interval) {
  const reffedCallback = useRef(callback);

  useEffect(() => {
    if (!interval) {
      return () => {};
    }

    const repeating = setInterval(() => {
      reffedCallback.current();
    }, interval);

    return () => clearInterval(repeating);
  }, [interval]);
}
