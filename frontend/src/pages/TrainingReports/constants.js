import PropTypes from 'prop-types';

import {
  startDateFilter,
  regionFilter,
  collaboratorsFilter,
  creatorFilter,
  eventIdFilter,
} from '../../components/filter/trainingReportFilters';

const TRAINING_REPORT_BASE_FILTER_CONFIG = [
  startDateFilter,
  creatorFilter,
  collaboratorsFilter,
  eventIdFilter,
];

const TRAINING_REPORT_CONFIG_WITH_REGIONS = [
  startDateFilter,
  regionFilter,
  creatorFilter,
  collaboratorsFilter,
  eventIdFilter,
];

// sort both by display prop
TRAINING_REPORT_BASE_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display));
TRAINING_REPORT_CONFIG_WITH_REGIONS.sort((a, b) => a.display.localeCompare(b.display));

export { TRAINING_REPORT_BASE_FILTER_CONFIG, TRAINING_REPORT_CONFIG_WITH_REGIONS };

export const dataPropTypes = PropTypes.shape({
  Creator: PropTypes.string,
  Audience: PropTypes.string,
  'Event ID': PropTypes.string,
  'Edit Title': PropTypes.string,
  'Full Event Title': PropTypes.string,
  'Reason for Activity': PropTypes.string,
  'Target Population(s)': PropTypes.string,
  'Event Organizer - Type of Event': PropTypes.string,
  'Event Duration/# NC Days of Support': PropTypes.string,
  'Overall Vision/Goal for the PD Event': PropTypes.string,
  startDate: PropTypes.string,
  endDate: PropTypes.string,
});

export const eventPropTypes = PropTypes.shape({
  id: PropTypes.number,
  ownerId: PropTypes.number,
  pocIds: PropTypes.arrayOf(PropTypes.number),
  collaboratorIds: PropTypes.arrayOf(PropTypes.number),
  regionId: PropTypes.number,
  data: dataPropTypes,
});

export const EVENT_STATUS = {
  NOT_STARTED: 'not-started',
  IN_PROGRESS: 'in-progress',
  COMPLETE: 'complete',
  SUSPENDED: 'suspended',
};
