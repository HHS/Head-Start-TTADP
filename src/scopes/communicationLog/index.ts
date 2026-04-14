/* eslint-disable import/prefer-default-export */
import { createFiltersToScopes } from '../utils';
import {
  afterCommunicationDate,
  beforeCommunicationDate,
  withinCommunicationDate,
} from './communicationDate';
import { withCreator, withoutCreator } from './creator';
import { withGroup, withoutGroup } from './group';
import { withIds, withoutIds } from './id';
import { withMethod, withoutMethod } from './method';
import { withMyReports, withoutMyReports } from './myReports';
import { withoutPurpose, withPurpose } from './purpose';
import { withoutRegion, withRegion } from './region';
import { withoutResult, withResult } from './result';
import { withoutRoles, withRoles } from './role';

export const topicToQuery = {
  id: {
    in: (query: string[]) => withIds(query),
    nin: (query: string[]) => withoutIds(query),
  },
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
  myReports: {
    in: (query: string[], _: unknown, userId: number) => withMyReports(query, _, userId),
    nin: (query: string[], _: unknown, userId: number) => withoutMyReports(query, _, userId),
  },
  result: {
    in: (query: string[]) => withResult(query),
    nin: (query: string[]) => withoutResult(query),
  },
  purpose: {
    in: (query: string[]) => withPurpose(query),
    nin: (query: string[]) => withoutPurpose(query),
  },
  region: {
    in: (query: string[]) => withRegion(query),
    nin: (query: string[]) => withoutRegion(query),
  },
  group: {
    in: (query: string[], _: unknown, userId: number) => withGroup(query, userId),
    nin: (query: string[], _: unknown, userId: number) => withoutGroup(query, userId),
  },
  role: {
    in: (query: string[]) => withRoles(query),
    nin: (query: string[]) => withoutRoles(query),
  },
};

export function communicationLogFiltersToScopes(filters, options, userId, validTopics) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, validTopics);
}
