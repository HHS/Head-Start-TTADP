import PropTypes from 'prop-types';

export const NEW_OBJECTIVE = {
  id: 'new',
  value: 'new',
  label: 'Create a new objective',
  text: '',
  ttaProvided: '',
  activityReports: [],
  resources: [],
  topics: [],
};

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
