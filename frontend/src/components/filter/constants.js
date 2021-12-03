import moment from 'moment';
import { formatDateRange } from '../DateRangeSelect';
import {
  DATE_CONDITIONS,
  SELECT_CONDITIONS,
} from '../constants';

const YEAR_TO_DATE = formatDateRange({
  yearToDate: true,
  forDateTime: true,
});

const EMPTY_CHECKBOX_SELECT = {
  Contains: [],
  'Does not contain': [],
};

const EMPTY_TEXT_INPUT = {
  Contains: '',
  'Does not contain': '',
};

const handleArrayQuery = (q) => {
  if (q.length) {
    return q.join(', ');
  }
  return '';
};

const handleStringQuery = (q) => q;

// eslint-disable-next-line import/prefer-default-export
export const FILTER_CONFIG = [
  {
    id: 'startDate',
    display: 'Date range',
    conditions: DATE_CONDITIONS,
    defaultValues: {
      'Is within': YEAR_TO_DATE,
      'Is after': '',
      'Is before': '',
    },
    displayQuery: (query) => {
      if (query.includes('-')) {
        return formatDateRange({
          string: query,
          withSpaces: false,
        });
      }
      return moment(query, 'YYYY/MM/DD').format('MM/DD/YYYY');
    },
  },
  {
    id: 'programSpecialist',
    display: 'Program Specialist',
    conditions: SELECT_CONDITIONS,
    defaultValues: EMPTY_TEXT_INPUT,
    displayQuery: handleStringQuery,
  },
  {
    id: 'reason',
    display: 'Reason',
    conditions: SELECT_CONDITIONS,
    defaultValues: EMPTY_CHECKBOX_SELECT,
    displayQuery: handleArrayQuery,
  },
  {
    id: 'region',
    display: 'Region',
    conditions: SELECT_CONDITIONS,
    displayQuery: handleArrayQuery,
  },
  {
    id: 'role',
    display: 'Role',
    conditions: SELECT_CONDITIONS,
    defaultValues: EMPTY_CHECKBOX_SELECT,
    displayQuery: handleArrayQuery,
  },
  {
    id: 'targetPopulation',
    display: 'Target Population',
    conditions: SELECT_CONDITIONS,
    defaultValues: EMPTY_CHECKBOX_SELECT,
    displayQuery: handleArrayQuery,
  },
];
