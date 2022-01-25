/* eslint-disable import/prefer-default-export */
import { createFiltersToScopes } from '../utils';
import { beforeStartDate, afterStartDate, withinStartDates } from './startDate';
import { withRegion, withoutRegion } from './region';
import { withRecipientName, withoutRecipientName } from './recipient';
import { withProgramSpecialist, withoutProgramSpecialist } from './programSpecialist';
import { withProgramTypes, withoutProgramTypes } from './programType';
import { withStateCode } from './stateCode';
import { withGrantNumber, withoutGrantNumber } from './grantNumber';

export const topicToQuery = {
  recipient: {
    ctn: (query) => withRecipientName(query),
    nctn: (query) => withoutRecipientName(query),
  },
  programSpecialist: {
    ctn: (query) => withProgramSpecialist(query),
    nctn: (query) => withoutProgramSpecialist(query),
  },
  programType: {
    in: (query) => withProgramTypes(query),
    nin: (query) => withoutProgramTypes(query),
  },
  grantNumber: {
    ctn: (query) => withGrantNumber(query),
    nctn: (query) => withoutGrantNumber(query),
  },
  stateCode: {
    ctn: (query) => withStateCode(query),
  },
  startDate: {
    bef: (query) => beforeStartDate(query),
    aft: (query) => afterStartDate(query),
    win: (query) => withinStartDates(query),
    in: (query) => withinStartDates(query),
  },
  region: {
    in: (query) => withRegion(query),
    nin: (query) => withoutRegion(query),
  },
};

export function grantsFiltersToScopes(filters) {
  return createFiltersToScopes(filters, topicToQuery);
}
