import PropTypes from 'prop-types';

export const dataPropTypes = PropTypes.shape({
  Creator: PropTypes.string,
  Audience: PropTypes.string,
  'Event ID': PropTypes.string,
  'Edit Title': PropTypes.string,
  'Sheet Name': PropTypes.string,
  'Full Event Title': PropTypes.string,
  'Reason for Activity': PropTypes.string,
  'Target Population(s)': PropTypes.string,
  'Event Organizer - Type of Event': PropTypes.string,
  'Event Duration/# NC Days of Support': PropTypes.string,
  'Overall Vision/Goal for the PD Event': PropTypes.string,
});

export const eventPropTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  ownerId: PropTypes.number.isRequired,
  pocId: PropTypes.number.isRequired,
  collaboratorIds: PropTypes.arrayOf(PropTypes.number),
  regionId: PropTypes.number.isRequired,
  createdAt: PropTypes.string.isRequired,
  updatedAt: PropTypes.string.isRequired,
  data: PropTypes.arrayOf(dataPropTypes),
});
