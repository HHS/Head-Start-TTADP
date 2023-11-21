/* eslint-disable import/prefer-default-export */
import { createFiltersToScopes } from '../utils';
import { withCreator, withoutCreator } from './creator';
import { withMethod, withoutMethod } from './method';
import { withResult, withoutResult } from './result';
import { afterCommunicationDate, beforeCommunicationDate, withinCommunicationDate } from './communicationDate';

export const topicToQuery = {
  creator: {
    ctn: (query: string[]) => withCreator(query),
    nctn: (query: string[]) => withoutCreator(query),
  },
  communicationDate: {
    bef: (query: string[]) => beforeCommunicationDate(query),
    aft: (query: string[]) => afterCommunicationDate(query),
    win: (query: string[]) => withinCommunicationDate(query),
    in: (query: string[]) => withinCommunicationDate(query),
  },
  method: {
    in: (query: string[]) => withMethod(query),
    nin: (query: string[]) => withoutMethod(query),
  },
  result: {
    in: (query: string[]) => withResult(query),
    nin: (query: string[]) => withoutResult(query),
  },
};

export function communicationLogFiltersToScopes(filters, options, userId) {
  return createFiltersToScopes(filters, topicToQuery, options, userId);
}
