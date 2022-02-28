import { useState, useEffect } from 'react';

export default function useLocalStorage(key, value, save = true) {
  const [storedValue, setStoredValue] = useState(value);

  useEffect(() => {
    if (save) {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    }
  }, [key, save, storedValue]);

  return [storedValue, setStoredValue];
}
