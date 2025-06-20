import React from 'react';
import { Button } from '@trussworks/react-uswds';
import { useHistory } from 'react-router-dom';
import {
  LOCAL_STORAGE_DATA_KEY,
  LOCAL_STORAGE_ADDITIONAL_DATA_KEY,
  LOCAL_STORAGE_EDITABLE_KEY,
} from '../../Constants';
import './index.scss';

function NewReport() {
  const history = useHistory();
  const key = 'new';
  const onClick = () => {
    try {
      // clear out any saved report data from local storage
      window.localStorage.removeItem(LOCAL_STORAGE_DATA_KEY(key));
      window.localStorage.removeItem(LOCAL_STORAGE_ADDITIONAL_DATA_KEY(key));
      window.localStorage.removeItem(LOCAL_STORAGE_EDITABLE_KEY(key));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    } finally {
      history.push('/activity-reports/new/activity-summary');
    }
  }; return (
    <Button
      onClick={onClick}
      className="usa-button smart-hub--new-report-btn"
      variant="unstyled"
    >
      <span className="smart-hub--plus">+</span>
      <span className="smart-hub--new-report">New Activity Report</span>
    </Button>
  );
}
export default NewReport;
