import { useMemo, useState } from 'react';

// adpated from https://usehooks.com/useLocalStorage/

export default function useSessionStorage(key, initialValue) {
  const item = useMemo(() => {
    const val = window.sessionStorage.getItem(key);

    try {
      return val ? JSON.parse(val) : initialValue;
    } catch (error) {
      return initialValue;
    }
  }, [initialValue, key]); // these won't change, so this won't be re-run

  // State to store our value
  const [storedValue, setStoredValue] = useState(item);

  // Return a wrapped version of useState's setter function that
  // persists the new value to sessionStorage.
  const setValue = (value) => {
    // Save state
    setStoredValue(value);

    // Save to session storage
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error);
    }
  };

  return [storedValue, setValue];
}
