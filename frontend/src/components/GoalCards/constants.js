import PropTypes from 'prop-types'

export const objectivePropTypes = PropTypes.shape({
  id: PropTypes.number,
  title: PropTypes.string,
  arNumber: PropTypes.string,
  ttaProvided: PropTypes.string,
  endDate: PropTypes.string,
  reasons: PropTypes.arrayOf(PropTypes.string),
  status: PropTypes.string,
})

export const goalPropTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  ids: PropTypes.arrayOf(PropTypes.number),
  goalStatus: PropTypes.string,
  createdAt: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  objectiveCount: PropTypes.number,
  objectives: PropTypes.arrayOf(objectivePropTypes),
  previousStatus: PropTypes.string,
  onAR: PropTypes.bool,
  grant: PropTypes.shape({
    number: PropTypes.string,
  }),
  statusChanges: PropTypes.arrayOf(
    PropTypes.shape({
      oldStatus: PropTypes.string,
      newStatus: PropTypes.string,
    })
  ),
  isReopened: PropTypes.bool,
})
