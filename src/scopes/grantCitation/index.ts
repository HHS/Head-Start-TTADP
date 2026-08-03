import { createFiltersToScopes } from '../utils';
import { withCitationRecipient } from './citationRecipient';
import { withFindingType, withoutFindingType } from './findingType';
import { withoutRegion, withRegion } from './regionId';
import {
  afterReportDeliveryDate,
  beforeReportDeliveryDate,
  withinReportDeliveryDates,
} from './reportDeliveryDate';
import { withStateCode } from './stateCode';

export const topicToQuery = {
  citationRecipient: {
    in: (query: string[]) => withCitationRecipient(query),
  },
  region: {
    in: (query: string[]) => withRegion(query),
    nin: (query: string[]) => withoutRegion(query),
  },
  findingType: {
    in: (query: string[]) => withFindingType(query),
    nin: (query: string[]) => withoutFindingType(query),
  },
  stateCode: {
    ctn: (query: string[]) => withStateCode(query),
  },
  reportDeliveryDate: {
    bef: (query: string[]) => beforeReportDeliveryDate(query),
    aft: (query: string[]) => afterReportDeliveryDate(query),
    win: (query: string[]) => withinReportDeliveryDates(query),
    in: (query: string[]) => withinReportDeliveryDates(query),
  },
};

export function grantCitationFiltersToScopes(filters, options, userId, validTopics) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, validTopics);
}
