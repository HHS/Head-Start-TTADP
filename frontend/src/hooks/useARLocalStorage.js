import { useEffect, useState, useMemo } from 'react';
import { REPORT_STATUSES } from '../Constants';
import useLocalStorage from './useLocalStorage';
import { storageAvailable } from './helpers';

/**
 * we're wrapping useLocalStorage so we can conditionally save to local storage and other times
 * use a basic "lose state"
 * @param {string} key
 * @param {string} defaultValue
 * @param {func} updateSavedToStorage stores the saved to storage time as a side effect
 * @returns
 */
export default function useARLocalStorage(key, defaultValue, updateSavedToStorage = () => {}) {
  const localStorageAvailable = useMemo(() => storageAvailable('localStorage'), []);
  const [saveReport, setSaveReport] = useState(false);
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
  }, [key, localStorageAvailable, setStoredValue, storedValue, updateSavedToStorage]);

  return [storedValue, (v) => {
    console.log(saveReport);
    if (saveReport) {
      const value = { ...v };
      updateSavedToStorage(new Date().toISOString());
      setStoredValue(value);
    } else {
      setStoredValue(v);
    }
  }];
}
