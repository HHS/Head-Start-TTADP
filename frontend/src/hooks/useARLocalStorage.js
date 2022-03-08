import { useEffect, useState, useMemo } from 'react';
import { REPORT_STATUSES } from '../Constants';
import useLocalStorage from './useLocalStorage';
import { storageAvailable } from './helpers';

/**
 * we're wrapping useLocalStorage so we can conditionally save to local storage and other times
 * use a basic "lose state"
 * @param {string} key
 * @param {string} defaultValue
 * @returns getter and setter a la useState
 */
export default function useARLocalStorage(key, defaultValue) {
  const localStorageAvailable = useMemo(() => storageAvailable('localStorage'), []);
  const [saveReport, setSaveReport] = useState(true);
  const [storedValue, setStoredValue] = useLocalStorage(key, defaultValue, saveReport);

  useEffect(() => {
    let toSave = true;

    if (storedValue
      && storedValue.calculatedStatus
      && (storedValue.calculatedStatus === REPORT_STATUSES.APPROVED
        || storedValue.calculatedStatus === REPORT_STATUSES.SUBMITTED
      )
    ) {
      toSave = false;
    }

    setSaveReport(toSave && localStorageAvailable);
  }, [key, localStorageAvailable, setStoredValue, storedValue]);

  return [storedValue, (v) => {
    const savedToStorage = new Date().toISOString();
    const createdInLocalStorage = v.createdInLocalStorage || savedToStorage;
    if (saveReport) {
      setStoredValue({
        ...v,
        savedToStorage,
        createdInLocalStorage,
      });
    } else {
      setStoredValue(v);
    }
  }];
}
