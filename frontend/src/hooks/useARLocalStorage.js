import useLocalStorage from './useLocalStorage';

/**
 * we're wrapping useLocalStorage so we can conditionally save to local storage and other times
 * use a basic "lose state"
 * @param {string} key
 * @param {string} defaultValue
 * @returns
 */
export default function useARLocalStorage(key, defaultValue) {
  const save = key !== 'new';
  const [storedValue, setStoredValue] = useLocalStorage(key, defaultValue, save);

  return [storedValue, setStoredValue];
}
