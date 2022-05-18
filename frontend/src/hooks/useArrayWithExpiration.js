import {
  useState,
  useCallback,
  useMemo,
} from 'react';

export const FIVE_MINUTES = 5 * 60 * 1000;

export default function useArrayWithExpiration(defaultValue) {
  const [state, setState] = useState(defaultValue);

  const push = useCallback((name) => {
    const currentTime = new Date();
    const fiveMinutesFromNow = new Date();
    fiveMinutesFromNow.setTime(currentTime.getTime() + FIVE_MINUTES);

    setState((previousState) => {
      const stateWithoutExpired = previousState.filter((currentValue) => {
        const ageOfStoredUser = currentTime - new Date(currentValue.expires);
        if (ageOfStoredUser > FIVE_MINUTES) {
          return false;
        }

        return true;
      });

      const expires = fiveMinutesFromNow.toJSON();
      const existing = stateWithoutExpired.findIndex((item) => name === item.name);
      if (existing !== -1) {
        stateWithoutExpired.splice(existing, 1);
      }

      const newItemWithDate = {
        name,
        expires,
      };

      return [...stateWithoutExpired, newItemWithDate];
    });
  }, []);

  // I am saving it this way so that when it is used
  // it is distinguishable from a traditional useState hook
  // (we could also build upon this to, for example, splice things)
  const updateState = useMemo(() => ({ push }), [push]);

  return [state, updateState];
}
