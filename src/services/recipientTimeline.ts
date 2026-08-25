import { TIMELINE_EVENT_TYPES } from '@ttahub/common/src/constants';
import type {
  RecipientTimelineEvent,
  RecipientTimelineRequestParams,
  RecipientTimelineResponse,
} from '@ttahub/common/src/recipientTimeline';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../models';
import { RECIPIENT_TIMELINE_SOURCES, type TimelineEventSource } from './recipientTimelineSources';

interface TimelineQueryRow {
  count: string | number;
  source: string | null;
  sourceId: number | null;
  date: string | null;
  eventType: string | null;
}

interface TimelineEventIndexParams {
  sources: readonly TimelineEventSource[];
  recipientId: number;
  regionId: number;
  limit: number;
  offset: number;
  direction: 'asc' | 'desc';
  replacements?: Record<string, unknown>;
}

const TIMELINE_EVENT_TYPE_SET = new Set<string>(TIMELINE_EVENT_TYPES);

const validateQueryOptions = (
  sources: readonly TimelineEventSource[],
  recipientId: number,
  regionId: number,
  limit: number,
  offset: number,
  direction: 'asc' | 'desc'
) => {
  if (!Number.isInteger(recipientId) || recipientId < 1) {
    throw new Error('Timeline recipientId must be a positive integer');
  }

  if (!Number.isInteger(regionId) || regionId < 1) {
    throw new Error('Timeline regionId must be a positive integer');
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Timeline limit must be an integer between 1 and 100');
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error('Timeline offset must be a non-negative integer');
  }

  if (direction !== 'asc' && direction !== 'desc') {
    throw new Error('Timeline direction must be asc or desc');
  }

  const sourceNames = sources.map(({ name }) => name.trim());
  if (
    sources.some(
      ({ name, query }) => name.trim() === '' || name !== name.trim() || query.trim() === ''
    ) ||
    new Set(sourceNames).size !== sourceNames.length
  ) {
    throw new Error(
      'Timeline event sources must have unique, whitespace-trimmed names and non-empty queries'
    );
  }
};

const isValidTimelineEventType = (
  eventType: string
): eventType is RecipientTimelineEvent['eventType'] => TIMELINE_EVENT_TYPE_SET.has(eventType);

const timelineIndexCte = (sources: readonly TimelineEventSource[]) => {
  const sourceQueries = sources.map(
    ({ query }, index) => `
      SELECT
        CAST(:timelineSource${index} AS TEXT) AS "source",
        "sourceEvent"."sourceId",
        CAST("sourceEvent"."date" AS DATE) AS "date",
        CAST("sourceEvent"."eventType" AS TEXT) AS "eventType",
        "sourceEvent"."recipientId",
        "sourceEvent"."regionId"
      FROM (
        ${query}
      ) AS "sourceEvent"
      WHERE
        "sourceEvent"."recipientId" = :recipientId
        AND "sourceEvent"."regionId" = :regionId`
  );

  return `
    WITH "timelineSourceEvents" AS (
      ${sourceQueries.join('\n      UNION ALL\n')}
    ),
    "timelineEvents" AS (
      SELECT DISTINCT
        "source",
        "sourceId",
        "date",
        "eventType"
      FROM "timelineSourceEvents"
      WHERE
        "sourceId" IS NOT NULL
        AND "date" IS NOT NULL
        AND "eventType" IS NOT NULL
    )`;
};

/**
 * Infrastructure query for a single, deduplicated event index across registered timeline sources.
 *
 * Pagination is applied only after the source results have been combined and deduplicated. The
 * stable source and sourceId tie-breakers prevent equal-date events from moving between pages.
 * Route handlers must call getRecipientTimeline rather than supplying source definitions directly.
 */
export async function queryTimelineEventIndex({
  sources,
  recipientId,
  regionId,
  limit,
  offset,
  direction,
  replacements = {},
}: TimelineEventIndexParams): Promise<RecipientTimelineResponse> {
  validateQueryOptions(sources, recipientId, regionId, limit, offset, direction);

  if (sources.length === 0) {
    return { count: 0, events: [] };
  }

  const cte = timelineIndexCte(sources);
  const queryReplacements = {
    ...replacements,
    recipientId,
    regionId,
    ...Object.fromEntries(sources.map(({ name }, index) => [`timelineSource${index}`, name])),
    timelineLimit: limit,
    timelineOffset: offset,
  };
  const safeDirection = direction.toUpperCase();

  const rows = (await sequelize.query(
    `${cte}
    , "timelinePage" AS (
      SELECT
        "source",
        "sourceId",
        "date",
        "eventType"
      FROM "timelineEvents"
      ORDER BY
        "date" ${safeDirection},
        "source" ASC,
        "sourceId" ASC,
        "eventType" ASC
      LIMIT :timelineLimit
      OFFSET :timelineOffset
    ),
    "timelineCount" AS (
      SELECT COUNT(*) AS "count"
      FROM "timelineEvents"
    )
    SELECT
      "timelineCount"."count",
      "timelinePage"."source",
      "timelinePage"."sourceId",
      "timelinePage"."date",
      "timelinePage"."eventType"
    FROM "timelineCount"
    LEFT JOIN "timelinePage" ON TRUE
    ORDER BY
      "timelinePage"."date" ${safeDirection},
      "timelinePage"."source" ASC,
      "timelinePage"."sourceId" ASC,
      "timelinePage"."eventType" ASC`,
    {
      replacements: queryReplacements,
      type: QueryTypes.SELECT,
    }
  )) as TimelineQueryRow[];

  const events: RecipientTimelineEvent[] = rows
    .filter(
      (row): row is TimelineQueryRow & Required<Omit<TimelineQueryRow, 'count'>> =>
        row.source !== null && row.sourceId !== null && row.date !== null && row.eventType !== null
    )
    .map(({ count: _count, ...event }) => {
      if (!isValidTimelineEventType(event.eventType)) {
        throw new Error(`Timeline source returned unsupported eventType: ${event.eventType}`);
      }

      return {
        source: event.source,
        sourceId: event.sourceId,
        date: event.date,
        eventType: event.eventType,
      };
    });

  return {
    count: Number(rows[0]?.count ?? 0),
    events,
  };
}

/**
 * Query the code-owned recipient timeline source registry. Timeline sources are added independently
 * to the registry while sharing the same scoping, deduplication, ordering, count, and pagination.
 */
export async function getRecipientTimeline(
  params: RecipientTimelineRequestParams
): Promise<RecipientTimelineResponse> {
  return queryTimelineEventIndex({
    sources: RECIPIENT_TIMELINE_SOURCES,
    recipientId: params.recipientId,
    regionId: params.regionId,
    limit: params.limit,
    offset: params.offset,
    direction: params.direction,
  });
}
