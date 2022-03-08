import { useMemo, useState, useEffect } from 'react';
import { storageAvailable } from './helpers';

/**
 * Wraps around useState by saving to local storage as a side effect
 * Accepts an optional "save" parameter that skips saving to local storage
 * (useful when you want to save in some circumstances, and skip in other, since hooks can't
 * be called conditionally)
 *
 * @param {string} key
 * @param {string} defaultValue
 * @param {boolean} save
 * @returns [getter, setter, boolean: isLocalStorageAvailable]
 */
export default function useLocalStorage(key, defaultValue, save = true) {
  const localStorageAvailable = useMemo(() => storageAvailable('localStorage'), []);
  const value = useMemo(() => {
    try {
      const curr = window.localStorage.getItem(key);
      return JSON.parse(curr);
    } catch (error) {
      return defaultValue;
    }
  }, [defaultValue, key]);

  const [storedValue, setStoredValue] = useState(value);

  useEffect(() => {
    if (save && localStorageAvailable) {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    }
  }, [key, localStorageAvailable, save, storedValue]);

  return [storedValue, setStoredValue, localStorageAvailable];
}
