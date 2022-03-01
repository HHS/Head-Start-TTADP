import { useEffect, useState } from 'react';
import { REPORT_STATUSES } from '../Constants';
import useLocalStorage from './useLocalStorage';

/**
 * we're wrapping useLocalStorage so we can conditionally save to local storage and other times
 * use a basic "lose state"
 * @param {string} key
 * @param {string} defaultValue
 * @returns
 */
export default function useARLocalStorage(key, defaultValue, activityReportId) {
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

    setSaveReport(toSave);
  }, [activityReportId, key, storedValue]);

  return [storedValue, setStoredValue];
}
