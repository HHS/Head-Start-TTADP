import { useMemo } from 'react';
import useLocalStorage from './useLocalStorage';

const { localStorage } = window;

export default function useARLocalStorage(key, value) {
  const defaultValue = useMemo(() => {
    const curr = localStorage.getItem(key);
    try {
      return JSON.parse(curr);
    } catch (error) {
      return value;
    }
  }, [key, value]);

  const save = key !== 'new';

  const [storedValue, setStoredValue] = useLocalStorage(key, defaultValue, save);

  return [storedValue, setStoredValue];
}
