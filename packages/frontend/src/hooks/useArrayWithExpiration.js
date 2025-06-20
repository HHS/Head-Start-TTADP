import useInterval from '@use-it/interval';
import {
  useState,
  useCallback,
  useMemo,
} from 'react';

export const TWO_MINUTES = 2 * 60 * 1000;

export default function useArrayWithExpiration(defaultValue, expiration = TWO_MINUTES) {
  const [state, setState] = useState(defaultValue);

  useInterval(() => {
    const currentTime = new Date();
    const expirationTime = new Date();
    expirationTime.setTime(currentTime.getTime() + expiration);

    setState((previousState) => {
      const stateWithoutExpired = previousState.filter((currentValue) => {
        const ageOfStoredUser = currentTime - new Date(currentValue.expires);
        if (ageOfStoredUser > expiration) {
          return false;
        }

        return true;
      });

      return [...stateWithoutExpired];
    });
  }, expiration);

  const empty = useCallback(() => {
    if (state.length) {
      setState([]);
    }
  }, [state.length]);

  const push = useCallback((name) => {
    const currentTime = new Date();
    const expirationTime = new Date();
    expirationTime.setTime(currentTime.getTime() + expiration);

    setState((previousState) => {
      const stateWithoutExpired = previousState.filter((currentValue) => {
        const ageOfStoredUser = currentTime - new Date(currentValue.expires);
        if (ageOfStoredUser > expiration) {
          return false;
        }

        return true;
      });

      const expires = expirationTime.toJSON();
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
  }, [expiration]);

  // I am saving it this way so that when it is used
  // it is distinguishable from a traditional useState hook
  const updateState = useMemo(() => ({ push, empty }), [push, empty]);

  return [state, updateState];
}
