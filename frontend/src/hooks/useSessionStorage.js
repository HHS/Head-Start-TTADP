import { useState, useEffect } from 'react';

export default function useSessionStorage(key, value) {
  const [storedValue, setStoredValue] = useState(value);

  // and so forth
  useEffect(() => {
    window.sessionStorage.setItem(key, JSON.stringify(storedValue));
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
