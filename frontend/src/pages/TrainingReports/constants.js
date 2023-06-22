import PropTypes from 'prop-types';

export const dataPropTypes = PropTypes.shape({
  Creator: PropTypes.string,
  Audience: PropTypes.string,
  eventId: PropTypes.string,
  'Edit Title': PropTypes.string,
  'Sheet Name': PropTypes.string,
  'Full Event Title': PropTypes.string,
  reasons: PropTypes.arrayOf(PropTypes.string),
  'Target Population(s)': PropTypes.string,
  eventOrganizer: PropTypes.string,
  'Event Duration/# NC Days of Support': PropTypes.string,
  'Overall Vision/Goal for the PD Event': PropTypes.string,
  startDate: PropTypes.string.isRequired,
  endDate: PropTypes.string.isRequired,
});

export const eventPropTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  ownerId: PropTypes.number.isRequired,
  pocId: PropTypes.number,
  collaboratorIds: PropTypes.arrayOf(PropTypes.number),
  regionId: PropTypes.number.isRequired,
  data: PropTypes.shape(dataPropTypes),
});

export const EVENT_STATUS = {
  NOT_STARTED: 'not-started',
  IN_PROGRESS: 'in-progress',
  COMPLETE: 'complete',
};
