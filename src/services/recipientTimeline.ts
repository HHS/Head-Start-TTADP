import { TIMELINE_EVENT_TYPES } from '@ttahub/common/src/constants';
import type {
  RecipientTimelineEvent,
  RecipientTimelineEventPresentation,
  RecipientTimelineFilter,
  RecipientTimelineFilterTopic,
  RecipientTimelineRequestParams,
  RecipientTimelineResponse,
} from '@ttahub/common/src/recipientTimeline';
import moment from 'moment';
import { QueryTypes } from 'sequelize';
import { serviceError } from '../lib/serviceError';
import { auditLogger } from '../logger';
import { sequelize } from '../models';
import {
  RECIPIENT_TIMELINE_SOURCES,
  type TimelineEventSource,
  type TimelineSourceBindings,
} from './recipientTimelineSources';

interface RecipientTimelineEventIndex {
  source: string;
  sourceId: number;
  date: string;
  eventType: RecipientTimelineEvent['eventType'];
}

interface TimelineQueryRow {
  count: string | number;
  source: string | null;
  sourceId: number | string | null;
  date: string | null;
  eventType: string | null;
}

export interface TimelineIndexResponse {
  count: number;
  events: RecipientTimelineEventIndex[];
}

interface TimelineEventIndexParams extends RecipientTimelineRequestParams {
  sources: readonly TimelineEventSource[];
}

const TIMELINE_EVENT_TYPE_SET = new Set<string>(TIMELINE_EVENT_TYPES);
const SHARED_FILTER_TOPICS = new Set<RecipientTimelineFilterTopic>(['date', 'eventType']);
const DATE_INPUT_FORMATS = [
  'YYYY/MM/DD',
  'YYYY-MM-DD',
  'YYYY/M/D',
  'YYYY-M-D',
  'MM/DD/YYYY',
  'M/D/YYYY',
];

const badTimelineRequest = (message: string) => serviceError(400, message, { message });

const validateQueryOptions = ({
  sources,
  recipientId,
  regionId,
  limit,
  offset,
  direction,
  sortBy,
}: TimelineEventIndexParams) => {
  if (!Number.isInteger(recipientId) || recipientId < 1) {
    throw badTimelineRequest('Timeline recipientId must be a positive integer');
  }

  if (!Number.isInteger(regionId) || regionId < 1) {
    throw badTimelineRequest('Timeline regionId must be a positive integer');
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw badTimelineRequest('Timeline limit must be an integer between 1 and 100');
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw badTimelineRequest('Timeline offset must be a non-negative integer');
  }

  if (direction !== 'asc' && direction !== 'desc') {
    throw badTimelineRequest('Timeline direction must be asc or desc');
  }

  if (sortBy !== 'date') {
    throw badTimelineRequest('Timeline sortBy must be date');
  }

  const sourceNames = sources.map(({ name }) => name);
  if (
    sources.some(
      ({ name, buildIndexQuery, loadDetails }) =>
        !/^[A-Za-z][A-Za-z0-9]*$/.test(name) ||
        typeof buildIndexQuery !== 'function' ||
        typeof loadDetails !== 'function'
    ) ||
    new Set(sourceNames).size !== sourceNames.length
  ) {
    throw new Error(
      'Timeline event sources must have unique alphanumeric names, index builders, and detail loaders'
    );
  }
};

const validateFilters = (
  filters: RecipientTimelineFilter[],
  sources: readonly TimelineEventSource[]
) => {
  const supportedSourceTopics = new Set(
    sources.flatMap(({ supportedFilterTopics }) => supportedFilterTopics)
  );

  filters.forEach(({ topic, condition, query }) => {
    if (!SHARED_FILTER_TOPICS.has(topic) && !supportedSourceTopics.has(topic)) {
      throw badTimelineRequest(`Recipient timeline filter is not supported: ${topic}`);
    }

    if (topic === 'date') {
      if (
        typeof query !== 'string' ||
        !['is', 'is within', 'is on or after', 'is on or before'].includes(condition)
      ) {
        throw badTimelineRequest('Timeline date filter is invalid');
      }
      return;
    }

    if (!Array.isArray(query) || query.length === 0 || !['is', 'is not'].includes(condition)) {
      throw badTimelineRequest(`Timeline ${topic} filter is invalid`);
    }

    if (
      topic === 'eventType' &&
      query.some((eventType) => !TIMELINE_EVENT_TYPE_SET.has(eventType))
    ) {
      throw badTimelineRequest('Timeline eventType filter contains an unsupported event type');
    }
  });
};

const isValidTimelineEventType = (
  eventType: string
): eventType is RecipientTimelineEvent['eventType'] => TIMELINE_EVENT_TYPE_SET.has(eventType);

const toIsoDate = (value: string): string | null => {
  const parsed = moment(value.trim(), DATE_INPUT_FORMATS, true);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
};

const toIsoRange = (value: string): [string, string] | null => {
  const candidates: Array<[string, string]> = [];
  for (let index = 1; index < value.length; index += 1) {
    if (value[index] !== '-') continue;
    const startDate = toIsoDate(value.slice(0, index));
    const endDate = toIsoDate(value.slice(index + 1));
    if (startDate && endDate) candidates.push([startDate, endDate]);
  }

  if (candidates.length !== 1 || candidates[0][0] > candidates[0][1]) return null;
  return candidates[0];
};

const addSharedFilters = (
  filters: RecipientTimelineFilter[],
  replacements: Record<string, unknown>
): string => {
  const predicates: string[] = [];
  let dateIndex = 0;
  let eventTypeIndex = 0;

  filters.forEach((filter) => {
    if (filter.topic === 'date') {
      if (typeof filter.query !== 'string') {
        throw badTimelineRequest('Timeline date filter is invalid');
      }

      if (filter.condition === 'is' || filter.condition === 'is within') {
        const range = toIsoRange(filter.query);
        if (!range) throw badTimelineRequest('Timeline date range is invalid');
        const startKey = `timelineDateStart${dateIndex}`;
        const endKey = `timelineDateEnd${dateIndex}`;
        replacements[startKey] = range[0];
        replacements[endKey] = range[1];
        predicates.push(`"date" BETWEEN :${startKey}::date AND :${endKey}::date`);
      } else {
        const date = toIsoDate(filter.query);
        if (!date) throw badTimelineRequest('Timeline date is invalid');
        const key = `timelineDate${dateIndex}`;
        replacements[key] = date;
        predicates.push(
          `"date" ${filter.condition === 'is on or after' ? '>=' : '<='} :${key}::date`
        );
      }
      dateIndex += 1;
    }

    if (filter.topic === 'eventType') {
      const key = `timelineEventTypes${eventTypeIndex}`;
      replacements[key] = filter.query;
      predicates.push(`"eventType" ${filter.condition === 'is not' ? 'NOT ' : ''}IN (:${key})`);
      eventTypeIndex += 1;
    }
  });

  return predicates.length ? `WHERE ${predicates.join('\n        AND ')}` : '';
};

const createSourceBindings = (
  sourceName: string,
  replacements: Record<string, unknown>
): TimelineSourceBindings => ({
  add(name: string, value: unknown) {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
      throw new Error(`Timeline source ${sourceName} supplied an invalid binding name: ${name}`);
    }
    const key = `timeline_${sourceName}_${name}`;
    if (Object.hasOwn(replacements, key)) {
      throw new Error(`Timeline source ${sourceName} supplied a duplicate binding: ${name}`);
    }
    replacements[key] = value;
    return `:${key}`;
  },
});

const buildTimelineIndexCte = (
  params: TimelineEventIndexParams,
  replacements: Record<string, unknown>
) => {
  // Compare UTC timestamps regardless of the database session timezone. DATE values start
  // at UTC midnight; timestamps without a timezone are also interpreted as UTC.
  const utcTimestamp = `CASE
    WHEN pg_typeof("sourceEvent"."date") = 'timestamp with time zone'::regtype
      THEN CAST("sourceEvent"."date" AS TIMESTAMP WITH TIME ZONE) AT TIME ZONE 'UTC'
    ELSE CAST("sourceEvent"."date" AS TIMESTAMP WITHOUT TIME ZONE)
  END`;
  const sourceQueries = params.sources.map((source, index) => {
    const query = source.buildIndexQuery(params, createSourceBindings(source.name, replacements));
    if (!query.trim()) {
      throw new Error(`Timeline source ${source.name} returned an empty index query`);
    }

    const sourceKey = `timelineSource${index}`;
    replacements[sourceKey] = source.name;
    return `
      SELECT
        CAST(:${sourceKey} AS TEXT) AS "source",
        "sourceEvent"."sourceId",
        CAST(${utcTimestamp} AS DATE) AS "date",
        ${utcTimestamp} AS "occurredAt",
        CAST("sourceEvent"."eventType" AS TEXT) AS "eventType",
        "sourceEvent"."recipientId",
        "sourceEvent"."regionId"
      FROM (
        ${query}
      ) AS "sourceEvent"
      WHERE
        "sourceEvent"."recipientId" = :recipientId
        AND "sourceEvent"."regionId" = :regionId`;
  });
  const sharedFilters = addSharedFilters(params.filters, replacements);

  return `
    WITH "timelineSourceEvents" AS (
      ${sourceQueries.join('\n      UNION ALL\n')}
    ),
    "timelineEvents" AS (
      SELECT DISTINCT ON ("source", "sourceId")
        "source",
        "sourceId",
        "date",
        "occurredAt",
        "eventType"
      FROM "timelineSourceEvents"
      WHERE
        "sourceId" IS NOT NULL
        AND "date" IS NOT NULL
        AND "eventType" IS NOT NULL
      ORDER BY "source", "sourceId", "occurredAt", "eventType"
    ),
    "filteredTimelineEvents" AS (
      SELECT "source", "sourceId", "date", "occurredAt", "eventType"
      FROM "timelineEvents"
      ${sharedFilters}
    )`;
};

/** Build the authoritative, deduplicated, filtered, and paginated event index. */
export async function queryTimelineEventIndex(
  params: TimelineEventIndexParams
): Promise<TimelineIndexResponse> {
  validateQueryOptions(params);
  validateFilters(params.filters, params.sources);

  if (params.sources.length === 0) return { count: 0, events: [] };

  const replacements: Record<string, unknown> = {
    recipientId: params.recipientId,
    regionId: params.regionId,
    timelineLimit: params.limit,
    timelineOffset: params.offset,
  };
  const cte = buildTimelineIndexCte(params, replacements);
  const safeDirection = params.direction.toUpperCase();

  const rows = (await sequelize.query(
    `${cte}
    , "timelinePage" AS (
      SELECT "source", "sourceId", "date", "occurredAt", "eventType"
      FROM "filteredTimelineEvents"
      ORDER BY "occurredAt" ${safeDirection}, "source" ASC, "sourceId" ASC, "eventType" ASC
      LIMIT :timelineLimit
      OFFSET :timelineOffset
    ),
    "timelineCount" AS (
      SELECT COUNT(*) AS "count"
      FROM "filteredTimelineEvents"
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
      "timelinePage"."occurredAt" ${safeDirection},
      "timelinePage"."source" ASC,
      "timelinePage"."sourceId" ASC,
      "timelinePage"."eventType" ASC`,
    { replacements, type: QueryTypes.SELECT }
  )) as TimelineQueryRow[];

  const events: RecipientTimelineEventIndex[] = rows
    .filter(
      (row): row is TimelineQueryRow & Required<Omit<TimelineQueryRow, 'count'>> =>
        row.source !== null && row.sourceId !== null && row.date !== null && row.eventType !== null
    )
    .map(({ source, sourceId: rawSourceId, date, eventType }) => {
      if (!isValidTimelineEventType(eventType)) {
        throw new Error(`Timeline source returned unsupported eventType: ${eventType}`);
      }
      const sourceId = Number(rawSourceId);
      if (!Number.isSafeInteger(sourceId) || sourceId < 1) {
        throw new Error(`Timeline source ${source} returned an invalid sourceId: ${rawSourceId}`);
      }
      return { source, sourceId, date, eventType };
    });

  return { count: Number(rows[0]?.count ?? 0), events };
}

const assertPresentation = (
  source: string,
  sourceId: number,
  presentation: RecipientTimelineEventPresentation
) => {
  const validByline =
    presentation?.byline === null ||
    (typeof presentation?.byline?.label === 'string' &&
      presentation.byline.label.trim() !== '' &&
      Array.isArray(presentation.byline.values) &&
      presentation.byline.values.every(
        (value) => typeof value === 'string' && value.trim() !== ''
      ));
  const validTags =
    Array.isArray(presentation?.tags) &&
    presentation.tags.every(
      ({ label, flagged }) =>
        typeof label === 'string' && label.trim() !== '' && typeof flagged === 'boolean'
    );
  const validDetails =
    Array.isArray(presentation?.details) &&
    presentation.details.every(
      ({ label, items }) =>
        typeof label === 'string' &&
        label.trim() !== '' &&
        Array.isArray(items) &&
        items.every(
          ({ text, link }) =>
            typeof text === 'string' &&
            text.trim() !== '' &&
            (link === undefined || typeof link === 'string')
        )
    );
  const validLinks =
    Array.isArray(presentation?.links) &&
    presentation.links.every(
      ({ label, to, external }) =>
        typeof label === 'string' &&
        label.trim() !== '' &&
        typeof to === 'string' &&
        to.trim() !== '' &&
        (external === undefined || typeof external === 'boolean')
    );
  if (
    !presentation ||
    (presentation.durationHours !== null &&
      (!Number.isFinite(presentation.durationHours) || presentation.durationHours < 0)) ||
    typeof presentation.title !== 'string' ||
    !presentation.title.trim() ||
    (presentation.subtitle !== null &&
      (typeof presentation.subtitle !== 'string' || !presentation.subtitle.trim())) ||
    !validByline ||
    !Array.isArray(presentation.indicators) ||
    presentation.indicators.some((indicator) => indicator !== 'multiRecipient') ||
    !validTags ||
    !validDetails ||
    !validLinks
  ) {
    throw new Error(
      `Timeline source ${source} returned invalid presentation for sourceId ${sourceId}`
    );
  }
};

/** Load details for a page while preserving the authoritative index identity and order. */
export async function loadTimelineEventDetails(
  index: TimelineIndexResponse,
  params: RecipientTimelineRequestParams,
  sources: readonly TimelineEventSource[]
): Promise<RecipientTimelineResponse> {
  if (index.events.length === 0) return { count: index.count, events: [] };

  const sourceByName = new Map(sources.map((source) => [source.name, source]));
  const idsBySource = new Map<string, number[]>();
  index.events.forEach(({ source, sourceId }) => {
    const ids = idsBySource.get(source) ?? [];
    ids.push(sourceId);
    idsBySource.set(source, ids);
  });

  const detailsBySource = new Map<string, Map<number, RecipientTimelineEventPresentation>>();
  await Promise.all(
    [...idsBySource].map(async ([sourceName, sourceIds]) => {
      const source = sourceByName.get(sourceName);
      if (!source) throw new Error(`Timeline index returned an unregistered source: ${sourceName}`);
      const requestedIds = new Set(sourceIds);
      const presentations = await source.loadDetails(sourceIds, params);
      if (!(presentations instanceof Map)) {
        throw new Error(`Timeline source ${sourceName} returned an invalid detail loading result`);
      }
      for (const sourceId of presentations.keys()) {
        if (!requestedIds.has(sourceId)) {
          throw new Error(
            `Timeline source ${sourceName} loaded details for unexpected sourceId ${sourceId}`
          );
        }
      }
      sourceIds.forEach((sourceId) => {
        if (!presentations.has(sourceId)) {
          auditLogger.error(`Timeline details missing for ${sourceName} sourceId ${sourceId}`);
          throw new Error(
            `Timeline source ${sourceName} did not load details for sourceId ${sourceId}`
          );
        }
      });
      detailsBySource.set(sourceName, presentations);
    })
  );

  const events = index.events.map((indexEvent): RecipientTimelineEvent => {
    const presentation = detailsBySource.get(indexEvent.source)?.get(indexEvent.sourceId);
    if (!presentation) {
      throw new Error(
        `Timeline source ${indexEvent.source} did not load details for sourceId ${indexEvent.sourceId}`
      );
    }
    assertPresentation(indexEvent.source, indexEvent.sourceId, presentation);

    return {
      source: indexEvent.source,
      sourceId: indexEvent.sourceId,
      date: indexEvent.date,
      eventType: indexEvent.eventType,
      durationHours: presentation.durationHours,
      title: presentation.title,
      subtitle: presentation.subtitle,
      byline: presentation.byline,
      indicators: presentation.indicators,
      tags: presentation.tags,
      details: presentation.details,
      links: presentation.links,
    };
  });

  return { count: index.count, events };
}

/** Query the code-owned registry, then load details for each represented source in a bounded batch. */
export async function getRecipientTimeline(
  params: RecipientTimelineRequestParams
): Promise<RecipientTimelineResponse> {
  const index = await queryTimelineEventIndex({ ...params, sources: RECIPIENT_TIMELINE_SOURCES });
  return loadTimelineEventDetails(index, params, RECIPIENT_TIMELINE_SOURCES);
}
