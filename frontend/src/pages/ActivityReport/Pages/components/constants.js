import React from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';

export const NO_ERROR = <></>;
export const ERROR_FORMAT = (message) => <span className="usa-error-message">{message}</span>;

export const NEW_OBJECTIVE = () => ({
  value: uuidv4(),
  label: 'Create a new objective',
  title: '',
  ttaProvided: '<p></p>',
  activityReports: [],
  resources: [],
  topics: [],
  roles: [],
  status: 'Not Started',
});

export const OBJECTIVE_PROP = PropTypes.shape({
  title: PropTypes.string,
  ttaProvided: PropTypes.string,
  status: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  label: PropTypes.string,
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  topics: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
  })),
  resources: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
  })),
  activityReports: PropTypes.arrayOf(
    PropTypes.shape({
      status: PropTypes.string,
    }),
  ),
});
