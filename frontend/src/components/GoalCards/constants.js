import PropTypes from 'prop-types';

export const objectivePropTypes = PropTypes.shape({
  id: PropTypes.number,
  title: PropTypes.string,
  arNumber: PropTypes.string,
  ttaProvided: PropTypes.string,
  endDate: PropTypes.string,
  reasons: PropTypes.arrayOf(PropTypes.string),
  status: PropTypes.string,
});

export const goalPropTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  ids: PropTypes.arrayOf(PropTypes.number),
  goalStatus: PropTypes.string,
  createdOn: PropTypes.string.isRequired,
  goalText: PropTypes.string.isRequired,
  goalTopics: PropTypes.arrayOf(PropTypes.string).isRequired,
  reasons: PropTypes.arrayOf(PropTypes.string).isRequired,
  objectiveCount: PropTypes.number.isRequired,
  goalNumbers: PropTypes.arrayOf(PropTypes.string.isRequired),
  objectives: PropTypes.arrayOf(objectivePropTypes),
  previousStatus: PropTypes.string,
  onAR: PropTypes.bool,
});
