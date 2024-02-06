import { useEffect, useRef } from 'react';

const useDebounceEffect = (
  callback,
  dependencies = [],
  delay = 1000,
) => {
  const inProgress = useRef(false);
  useEffect(() => {
    const cb = async () => {
      await callback();
      inProgress.current = false;
    };
    const effect = setTimeout(async () => {
      if (inProgress.current) {
        return;
      }

      inProgress.current = true;
      await cb();
    }, delay);

    return () => clearTimeout(effect);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
};

export default useDebounceEffect;
