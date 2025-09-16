import React from 'react';
import NewReportButton from './NewReportButton';
import {
  LOCAL_STORAGE_AR_DATA_KEY,
  LOCAL_STORAGE_AR_ADDITIONAL_DATA_KEY,
  LOCAL_STORAGE_AR_EDITABLE_KEY,
} from '../Constants';

export default function NewActivityReportButton() {
  return (
    <NewReportButton
      onClick={() => {
        const key = 'new';
        try {
          // clear out any saved report data from local storage
          window.localStorage.removeItem(LOCAL_STORAGE_AR_DATA_KEY(key));
          window.localStorage.removeItem(LOCAL_STORAGE_AR_ADDITIONAL_DATA_KEY(key));
          window.localStorage.removeItem(LOCAL_STORAGE_AR_EDITABLE_KEY(key));
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log(e);
        }
      }}
      to="/activity-reports/new/activity-summary"
    >
      New Activity Report
    </NewReportButton>
  );
}
