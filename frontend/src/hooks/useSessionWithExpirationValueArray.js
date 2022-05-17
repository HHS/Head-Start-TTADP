import {
  useState,
  useCallback,
  useMemo,
} from 'react';

export const FIVE_MINUTES = 5 * 60 * 1000;

export default function useSessionWithExpirationValueArray(prefix, defaultValue) {
  const [state, setState] = useState(defaultValue);

  const push = useCallback((newItem) => {
    const currentTime = new Date();
    const fiveMinutesFromNow = new Date();
    fiveMinutesFromNow.setTime(currentTime.getTime() + FIVE_MINUTES);

    setState((previousState) => {
      const stateWithoutExpired = previousState.filter((currentValue) => {
        const key = `${prefix}-${currentValue.name}`;
        const storedUser = sessionStorage.getItem(key);

        if (!storedUser) {
          return false;
        }

        const parsedStoredUser = JSON.parse(storedUser);
        const ageOfStoredUser = currentTime - new Date(parsedStoredUser.expires);

        if (ageOfStoredUser > FIVE_MINUTES) {
          sessionStorage.removeItem(key); // remove from local storage as a side effect
          return false;
        }

        return true;
      });

      const newItemWithDate = {
        name: newItem,
        expires: fiveMinutesFromNow.toJSON(),
      };

      sessionStorage.setItem(`${prefix}-${newItem}`, JSON.stringify(newItemWithDate));

      return [...stateWithoutExpired, newItemWithDate];
    });
  }, [prefix]);

  // I am saving it this way so that when it is used
  // it is distinguishable from a traditional useState hook
  // (we could also build upon this to, for example, splice things)
  const updateState = useMemo(() => ({ push }), [push]);

  return [state, updateState];
}
