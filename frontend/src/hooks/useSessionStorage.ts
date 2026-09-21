import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

export default function useSessionStorage<T>(
  key: string,
  value: T
): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(value);

  // and so forth
  useEffect(() => {
    window.sessionStorage.setItem(key, JSON.stringify(storedValue));
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
