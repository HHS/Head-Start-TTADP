import { useEffect } from 'react';

export default function useOnClickOutside(handler, refs) {
  useEffect(
    () => {
      const listener = (event) => {
        // Do nothing if click any ref's element or descendent elements
        const clickedOutsideOfAnyRef = refs.some((ref) => {
          if (ref.current) {
            return ref.current.contains(event.target);
          }
          return false;
        });

        if (clickedOutsideOfAnyRef) {
          return;
        }

        handler(event);
      };

      document.addEventListener('mousedown', listener);
      document.addEventListener('touchstart', listener);

      return () => {
        document.removeEventListener('mousedown', listener);
        document.removeEventListener('touchstart', listener);
      };
    }, [refs, handler],
  );
}
