import { useEffect, useState } from 'react';
import { REPORT_STATUSES } from '../Constants';
import useLocalStorage from './useLocalStorage';

/**
 * we're wrapping useLocalStorage so we can conditionally save to local storage and other times
 * use a basic "lose state"
 * @param {string} key
 * @param {string} defaultValue
 * @returns [getter, setter, boolean: isLocalStorageAvailable]
 */
export default function useARLocalStorage(key, defaultValue) {
  const [saveReport, setSaveReport] = useState(true);
  const [
    storedValue, setStoredValue, localStorageAvailable,
  ] = useLocalStorage(key, defaultValue, saveReport);

  useEffect(() => {
    let toSave = true;

    if (storedValue
      && storedValue.calculatedStatus
      && storedValue.calculatedStatus !== REPORT_STATUSES.DRAFT
    ) {
      toSave = false;
    }

    setSaveReport(toSave && localStorageAvailable);
  }, [key, localStorageAvailable, setStoredValue, storedValue]);

  // we return the setter with a passthrough function that also adds local storage timestamps
  // to the report data object, that way we can show them on the relevant alerts and stuff
  // on the frontend
  return [storedValue, (formData, updateSavedTime = false) => {
    const savedToStorageTime = updateSavedTime ? new Date().toISOString() : null;
    const createdInLocalStorage = formData.createdInLocalStorage || savedToStorageTime;
    if (saveReport) {
      setStoredValue({
        ...formData,
        savedToStorageTime,
        createdInLocalStorage,
      });
    } else {
      setStoredValue(formData);
    }
  }, localStorageAvailable];
}
