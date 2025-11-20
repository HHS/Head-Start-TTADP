import React from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
} from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';

const MissingCitationAlerts = ({
  reportId,
  grantsMissingMonitoring,
  grantsMissingCitations,
}) => (
  <>
    {
        grantsMissingMonitoring.length > 0 && (
        <Alert validation slim type="error">
            {
                    grantsMissingMonitoring.length > 1
                      ? 'These grants do not have the standard monitoring goal:'
                      : 'This grant does not have the standard monitoring goal:'
                }
          <ul>
            {grantsMissingMonitoring.map((grant) => <li key={grant}>{grant}</li>)}
          </ul>
          You can either:
          <ul>
            <li>Add a different goal to the report</li>
            <li>
              Remove the grant from the
              {' '}
              <Link to={`/activity-reports/${reportId}/activity-summary`}>Activity summary</Link>
            </li>
          </ul>
        </Alert>
        )
    }
    {
        grantsMissingCitations.length > 0 && (
        <Alert validation slim type="error">
            {
                    grantsMissingCitations.length > 1
                      ? 'These grants do not have any of the citations selected:'
                      : 'This grant does not have any of the citations selected:'
                }
          <ul>
            {grantsMissingCitations.map((grant) => <li key={grant}>{grant}</li>)}
          </ul>
          You can either:
          <ul>
            <li>Add a citation for this grant under an objective for the monitoring goal</li>
            <li>
              Remove the grant from the
              {' '}
              <Link to={`/activity-reports/${reportId}/activity-summary`}>Activity summary</Link>
            </li>
            <li>Add another goal to the report</li>
          </ul>
        </Alert>
        )
    }
  </>
);

MissingCitationAlerts.propTypes = {
  reportId: PropTypes.number.isRequired,
  grantsMissingMonitoring: PropTypes.arrayOf(PropTypes.string).isRequired,
  grantsMissingCitations: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default MissingCitationAlerts;
