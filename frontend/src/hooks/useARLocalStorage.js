import { useEffect, useState, useMemo } from 'react';
import { REPORT_STATUSES } from '../Constants';
import useLocalStorage from './useLocalStorage';
import { storageAvailable } from './helpers';

/**
 * we're wrapping useLocalStorage so we can conditionally save to local storage and other times
 * use a basic "lose state"
 * @param {string} key
 * @param {string} defaultValue
 * @returns
 */
export default function useARLocalStorage(key, defaultValue, activityReportId) {
  const localStorageAvailable = useMemo(() => storageAvailable('localStorage'), []);
  const [saveReport, setSaveReport] = useState(false);
  const [storedValue, setStoredValue] = useLocalStorage(key, defaultValue, saveReport);

  useEffect(() => {
    let toSave = false;

    if (activityReportId !== 'new') {
      toSave = true;
    }

    if (storedValue
      && storedValue.calculatedStatus
      && (storedValue.calculatedStatus === REPORT_STATUSES.APPROVED
        || storedValue.calculatedStatus === REPORT_STATUSES.SUBMITTED
      )
    ) {
      toSave = false;
    }

    setSaveReport(toSave && localStorageAvailable);
  }, [activityReportId, key, localStorageAvailable, storedValue]);

  return [storedValue, (v) => {
    if (saveReport) {
      const value = { ...v, savedToStorage: new Date().toISOString() };
      setStoredValue(value);
    } else {
      setStoredValue(v);
    }
  }];
}
