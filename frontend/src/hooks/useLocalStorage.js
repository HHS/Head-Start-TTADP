import { useState, useEffect } from 'react';

export default function useLocalStorage(key, value) {
  const [storedValue, setStoredValue] = useState(value);

  // and so forth
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(storedValue));
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
