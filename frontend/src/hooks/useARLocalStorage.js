import { useMemo } from 'react';
import useLocalStorage from './useLocalStorage';

export default function useARLocalStorage(key, value) {
  const defaultValue = useMemo(() => {
    try {
      const curr = window.localStorage.getItem(key);
      return JSON.parse(curr);
    } catch (error) {
      return value;
    }
  }, [key, value]);

  const save = key !== 'new';

  const [storedValue, setStoredValue] = useLocalStorage(key, defaultValue, save);

  return [storedValue, setStoredValue];
}
