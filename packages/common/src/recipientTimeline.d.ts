import type {
  TIMELINE_DATE_FILTER_CONDITIONS,
  TIMELINE_EVENT_TYPES,
  TIMELINE_FILTER_TOPICS,
  TIMELINE_SELECT_FILTER_CONDITIONS,
} from './constants';

export type RecipientTimelineFilterTopic = (typeof TIMELINE_FILTER_TOPICS)[number];
export type RecipientTimelineDateFilterCondition = (typeof TIMELINE_DATE_FILTER_CONDITIONS)[number];
export type RecipientTimelineSelectFilterCondition =
  (typeof TIMELINE_SELECT_FILTER_CONDITIONS)[number];
export type RecipientTimelineFilterCondition =
  | RecipientTimelineDateFilterCondition
  | RecipientTimelineSelectFilterCondition;
export type RecipientTimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export interface RecipientTimelineFilter {
  topic: RecipientTimelineFilterTopic;
  condition: RecipientTimelineFilterCondition;
  query: string | string[];
}

export interface RecipientTimelineRequestParams {
  recipientId: number;
  regionId: number;
  limit: number;
  offset: number;
  sortBy: 'date';
  direction: 'asc' | 'desc';
  filters: RecipientTimelineFilter[];
  excludeMultiRecipientCommunications: boolean;
}

export interface RecipientTimelineEvent {
  source: string;
  sourceId: number;
  date: string;
  eventType: RecipientTimelineEventType;
}

export interface RecipientTimelineResponse {
  count: number;
  events: RecipientTimelineEvent[];
}
