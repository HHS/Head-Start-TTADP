interface RecipientTimelineFilter {
  topic: 'date' | 'purpose' | 'standard' | 'eventType';
  condition: string;
  query: string | string[];
}

interface RecipientTimelineParams {
  recipientId: number;
  regionId: number;
  limit: number;
  offset: number;
  sortBy: 'date';
  direction: 'asc' | 'desc';
  filters: RecipientTimelineFilter[];
  excludeMultiRecipientCommunications: boolean;
}

interface RecipientTimelineResponse {
  count: number;
  events: unknown[];
}

export async function getRecipientTimeline(
  _params: RecipientTimelineParams
): Promise<RecipientTimelineResponse> {
  return {
    count: 0,
    events: [],
  };
}
