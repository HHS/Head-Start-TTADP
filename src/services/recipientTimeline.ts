interface RecipientTimelineParams {
  recipientId: number;
  regionId: number;
  limit: number;
  offset: number;
  sortBy: 'date';
  direction: 'asc' | 'desc';
  filters: string[];
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
