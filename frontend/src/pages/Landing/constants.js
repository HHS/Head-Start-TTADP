import moment from 'moment';

export const CONTAINS = 'Contains';
export const NOT_CONTAINS = 'Does not contain';
export const BEFORE = 'Is before';
export const AFTER = 'Is after';
export const WITHIN = 'Is within';

export const SELECT_CONDITIONS = [CONTAINS, NOT_CONTAINS];
export const DATE_CONDITIONS = [BEFORE, AFTER, WITHIN];

export const DATE_FMT = 'YYYY/MM/DD';
export const EARLIEST_FILTER_DATE = moment('2020-09-01');

export const QUERY_CONDITIONS = {
  [CONTAINS]: 'in[]',
  [NOT_CONTAINS]: 'nin[]',
  [BEFORE]: 'bef',
  [AFTER]: 'aft',
  [WITHIN]: 'win',
};
