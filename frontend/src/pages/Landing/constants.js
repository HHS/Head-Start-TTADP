export const CONTAINS = 'Contains';
export const NOT_CONTAINS = 'Does not contain';
export const BEFORE = 'Is before';
export const AFTER = 'Is after';
export const WITHIN = 'Is within';
export const IS = 'Is';
export const ONE_OF = 'One of';

export const SELECT_CONDITIONS = [CONTAINS, NOT_CONTAINS];
export const DATE_CONDITIONS = [BEFORE, AFTER, WITHIN];

export const QUERY_CONDITIONS = {
  [ONE_OF]: 'in',
  [CONTAINS]: 'in[]',
  [NOT_CONTAINS]: 'nin[]',
  [BEFORE]: 'bef',
  [AFTER]: 'aft',
  [WITHIN]: 'win',
  [IS]: 'is',
};
