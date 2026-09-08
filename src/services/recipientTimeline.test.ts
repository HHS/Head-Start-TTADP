import type { RecipientTimelineRequestParams } from '@ttahub/common/src/recipientTimeline';
import { sequelize } from '../models';
import {
  hydrateTimelineEventIndex,
  queryTimelineEventIndex,
  type TimelineIndexResponse,
} from './recipientTimeline';
import type {
  RecipientTimelineEventPresentation,
  TimelineEventSource,
} from './recipientTimelineSources';

const timelineParams: RecipientTimelineRequestParams = {
  recipientId: 100000,
  regionId: 1,
  limit: 20,
  offset: 0,
  sortBy: 'date',
  direction: 'desc',
  filters: [],
  excludeMultiRecipientCommunications: false,
};

const presentation = (title: string): RecipientTimelineEventPresentation => ({
  durationHours: null,
  title,
  subtitle: null,
  byline: null,
  indicators: [],
  tags: [],
  details: [],
  links: [],
});

const source = (
  name: string,
  query: string,
  presentations: Map<number, RecipientTimelineEventPresentation> = new Map()
): TimelineEventSource => ({
  name,
  supportedFilterTopics: [],
  buildIndexQuery: () => query,
  hydrate: async () => presentations,
});

const timelineSources: TimelineEventSource[] = [
  source(
    'activityReport',
    `
      SELECT
        "event"."sourceId",
        "event"."date",
        "event"."eventType",
        "eventGrant"."recipientId",
        "eventGrant"."regionId"
      FROM (
        VALUES
          (101, DATE '2026-08-21', 'TTA activity'),
          (102, DATE '2026-08-20', 'TTA activity'),
          (103, DATE '2026-08-20', 'TTA activity'),
          (104, DATE '2026-08-22', 'TTA activity'),
          (105, DATE '2026-08-22', 'TTA activity')
      ) AS "event"("sourceId", "date", "eventType")
      JOIN (
        VALUES
          (101, 1001, 100000, 1),
          (101, 1002, 100000, 1),
          (102, 1003, 100000, 1),
          (103, 1004, 100000, 1),
          (104, 1005, 200000, 1),
          (105, 1006, 100000, 2)
      ) AS "eventGrant"("sourceId", "grantId", "recipientId", "regionId")
        ON "eventGrant"."sourceId" = "event"."sourceId"`
  ),
  source(
    'communicationLog',
    `
      SELECT *
      FROM (
        VALUES
          (101, DATE '2026-08-21', 'Email communication', 100000, 1),
          (201, DATE '2026-08-19', 'Phone communication', 100000, 1),
          (202, DATE '2026-08-22', 'Phone communication', 200000, 1),
          (203, DATE '2026-08-22', 'Phone communication', 100000, 2)
      ) AS "event"("sourceId", "date", "eventType", "recipientId", "regionId")`
  ),
];

const queryTestTimeline = (
  params: RecipientTimelineRequestParams = timelineParams,
  sources: readonly TimelineEventSource[] = timelineSources
) => queryTimelineEventIndex({ ...params, sources });

afterAll(async () => sequelize.close());

describe('queryTimelineEventIndex', () => {
  it('deduplicates a multi-grant activity report before count and pagination', async () => {
    const result = await queryTestTimeline({ ...timelineParams, limit: 2 });

    expect(result.count).toBe(5);
    expect(result.events).toEqual([
      {
        source: 'activityReport',
        sourceId: 101,
        date: '2026-08-21',
        eventType: 'TTA activity',
      },
      {
        source: 'communicationLog',
        sourceId: 101,
        date: '2026-08-21',
        eventType: 'Email communication',
      },
    ]);
  });

  it('orders activity reports deterministically with other event types', async () => {
    const result = await queryTestTimeline({
      ...timelineParams,
      direction: 'asc',
      limit: 5,
    });

    expect(result.events.map(({ source, sourceId, date }) => [source, sourceId, date])).toEqual([
      ['communicationLog', 201, '2026-08-19'],
      ['activityReport', 102, '2026-08-20'],
      ['activityReport', 103, '2026-08-20'],
      ['activityReport', 101, '2026-08-21'],
      ['communicationLog', 101, '2026-08-21'],
    ]);
  });

  it('applies date filters after combining and deduplicating sources', async () => {
    const result = await queryTestTimeline({
      ...timelineParams,
      filters: [{ topic: 'date', condition: 'is within', query: '2026/08/20-2026/08/20' }],
    });

    expect(result.count).toBe(2);
    expect(result.events.map(({ sourceId }) => sourceId)).toEqual([102, 103]);
  });

  it('applies inclusive single-ended date filters', async () => {
    const result = await queryTestTimeline({
      ...timelineParams,
      filters: [{ topic: 'date', condition: 'is on or before', query: '08/19/2026' }],
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].sourceId).toBe(201);
  });

  it('applies event type inclusion and exclusion filters', async () => {
    const included = await queryTestTimeline({
      ...timelineParams,
      filters: [{ topic: 'eventType', condition: 'is', query: ['TTA activity'] }],
    });
    const excluded = await queryTestTimeline({
      ...timelineParams,
      filters: [{ topic: 'eventType', condition: 'is not', query: ['TTA activity'] }],
    });

    expect(included.count).toBe(3);
    expect(excluded.events.map(({ eventType }) => eventType)).toEqual([
      'Email communication',
      'Phone communication',
    ]);
  });

  it('returns the total count when the requested page is empty', async () => {
    await expect(queryTestTimeline({ ...timelineParams, offset: 20 })).resolves.toEqual({
      count: 5,
      events: [],
    });
  });

  it('keeps source bindings namespaced away from shared replacements', async () => {
    const namespacedSource: TimelineEventSource = {
      name: 'boundSource',
      supportedFilterTopics: [],
      buildIndexQuery: (_context, bindings) => `
        SELECT
          301 AS "sourceId",
          DATE '2026-08-21' AS "date",
          CAST(${bindings.add('recipientId', 'TTA activity')} AS TEXT) AS "eventType",
          100000 AS "recipientId",
          1 AS "regionId"`,
      hydrate: async () => new Map(),
    };

    const result = await queryTestTimeline(timelineParams, [namespacedSource]);
    expect(result.events[0].eventType).toBe('TTA activity');
  });

  it.each([
    {
      description: 'an unsupported source-specific filter',
      params: {
        ...timelineParams,
        filters: [{ topic: 'purpose', condition: 'is', query: ['Follow-up'] }],
      },
      error: 'Recipient timeline filter is not supported: purpose',
    },
    {
      description: 'an invalid date',
      params: {
        ...timelineParams,
        filters: [{ topic: 'date', condition: 'is on or after', query: 'not-a-date' }],
      },
      error: 'Timeline date is invalid',
    },
    {
      description: 'an invalid date range',
      params: {
        ...timelineParams,
        filters: [{ topic: 'date', condition: 'is within', query: '2026/08/21-2026/08/20' }],
      },
      error: 'Timeline date range is invalid',
    },
  ] as const)('rejects $description', async ({ params, error }) => {
    await expect(
      queryTestTimeline(params as unknown as RecipientTimelineRequestParams)
    ).rejects.toThrow(error);
  });

  it.each([
    [{ ...timelineParams, recipientId: 0 }, 'Timeline recipientId must be a positive integer'],
    [{ ...timelineParams, regionId: 0 }, 'Timeline regionId must be a positive integer'],
    [{ ...timelineParams, limit: 101 }, 'Timeline limit must be an integer between 1 and 100'],
    [{ ...timelineParams, offset: -1 }, 'Timeline offset must be a non-negative integer'],
    [{ ...timelineParams, direction: 'sideways' }, 'Timeline direction must be asc or desc'],
  ])('rejects invalid query options', async (params, error) => {
    await expect(queryTestTimeline(params as RecipientTimelineRequestParams)).rejects.toThrow(
      error as string
    );
  });

  it('rejects duplicate or unsafe source names', async () => {
    await expect(
      queryTestTimeline(timelineParams, [
        timelineSources[0],
        { ...timelineSources[1], name: 'a b' },
      ])
    ).rejects.toThrow('Timeline event sources must have unique alphanumeric names');
    await expect(
      queryTestTimeline(timelineParams, [
        timelineSources[0],
        { ...timelineSources[1], name: timelineSources[0].name },
      ])
    ).rejects.toThrow('Timeline event sources must have unique alphanumeric names');
  });

  it('rejects unsupported event types returned by a source', async () => {
    await expect(
      queryTestTimeline(timelineParams, [
        source(
          'badSource',
          `SELECT 301 AS "sourceId", DATE '2026-08-21' AS "date",
            'Typo activity' AS "eventType", 100000 AS "recipientId", 1 AS "regionId"`
        ),
      ])
    ).rejects.toThrow('Timeline source returned unsupported eventType: Typo activity');
  });
});

describe('hydrateTimelineEventIndex', () => {
  const index: TimelineIndexResponse = {
    count: 2,
    events: [
      {
        source: 'activityReport',
        sourceId: 20,
        date: '2026-08-21',
        eventType: 'TTA activity',
      },
      {
        source: 'communicationLog',
        sourceId: 10,
        date: '2026-08-20',
        eventType: 'Email communication',
      },
    ],
  };

  it('restores index order and protects authoritative fields from hydrator output', async () => {
    const activityPresentation = {
      ...presentation('TTA activity'),
      durationHours: 1.5,
      subtitle: 'On-site support',
      byline: { label: 'Specialists', values: ['Alex Smith, GS'] },
      indicators: ['multiRecipient'],
      tags: [{ label: 'Monitoring', flagged: true }],
      details: [
        {
          label: 'Citations addressed',
          items: [{ text: 'Citation 1', link: '/citations/1' }],
        },
      ],
      links: [{ label: 'View activity report', to: '/activity-reports/view/20', external: false }],
      source: 'wrongSource',
      sourceId: 999,
      date: '1900-01-01',
      eventType: 'Phone communication',
    } as RecipientTimelineEventPresentation;
    const sources = [
      source('activityReport', 'SELECT 1', new Map([[20, activityPresentation]])),
      source('communicationLog', 'SELECT 1', new Map([[10, presentation('Email communication')]])),
    ];

    const result = await hydrateTimelineEventIndex(index, timelineParams, sources);

    expect(
      result.events.map(({ source, sourceId, date, eventType, title }) => ({
        source,
        sourceId,
        date,
        eventType,
        title,
      }))
    ).toEqual([
      {
        source: 'activityReport',
        sourceId: 20,
        date: '2026-08-21',
        eventType: 'TTA activity',
        title: 'TTA activity',
      },
      {
        source: 'communicationLog',
        sourceId: 10,
        date: '2026-08-20',
        eventType: 'Email communication',
        title: 'Email communication',
      },
    ]);
  });

  it('fails rather than silently dropping a missing hydration result', async () => {
    const sources = [
      source('activityReport', 'SELECT 1', new Map()),
      source('communicationLog', 'SELECT 1', new Map([[10, presentation('Email')]])),
    ];

    await expect(hydrateTimelineEventIndex(index, timelineParams, sources)).rejects.toThrow(
      'Timeline source activityReport did not hydrate sourceId 20'
    );
  });

  it('fails when a hydrator returns an unexpected ID', async () => {
    const sources = [
      source(
        'activityReport',
        'SELECT 1',
        new Map([
          [20, presentation('TTA activity')],
          [21, presentation('Unexpected')],
        ])
      ),
      source('communicationLog', 'SELECT 1', new Map([[10, presentation('Email')]])),
    ];

    await expect(hydrateTimelineEventIndex(index, timelineParams, sources)).rejects.toThrow(
      'Timeline source activityReport hydrated unexpected sourceId 21'
    );
  });

  it.each([
    ['a negative duration', { durationHours: -1 }],
    ['a blank title', { title: ' ' }],
    ['a non-string subtitle', { subtitle: 1 }],
    ['a blank byline label', { byline: { label: ' ', values: ['Alex Smith'] } }],
    ['a blank byline value', { byline: { label: 'Specialists', values: [' '] } }],
    ['an unsupported indicator', { indicators: ['unexpected'] }],
    ['a blank tag label', { tags: [{ label: ' ', flagged: false }] }],
    ['a non-boolean tag flag', { tags: [{ label: 'Monitoring', flagged: 'yes' }] }],
    ['a blank detail label', { details: [{ label: ' ', items: [{ text: 'Value' }] }] }],
    ['a blank detail item', { details: [{ label: 'Topics', items: [{ text: ' ' }] }] }],
    [
      'a non-string detail link',
      { details: [{ label: 'Topics', items: [{ text: 'Value', link: 1 }] }] },
    ],
    ['a blank supporting-link label', { links: [{ label: ' ', to: '/reports/20' }] }],
    ['a blank supporting-link target', { links: [{ label: 'View report', to: ' ' }] }],
    [
      'a non-boolean external flag',
      { links: [{ label: 'View report', to: '/reports/20', external: 'yes' }] },
    ],
  ])('rejects presentation data with %s', async (_description, invalidFields) => {
    const invalidPresentation = {
      ...presentation('TTA activity'),
      ...invalidFields,
    } as unknown as RecipientTimelineEventPresentation;
    const singleEventIndex: TimelineIndexResponse = {
      count: 1,
      events: [index.events[0]],
    };
    const sources = [source('activityReport', 'SELECT 1', new Map([[20, invalidPresentation]]))];

    await expect(
      hydrateTimelineEventIndex(singleEventIndex, timelineParams, sources)
    ).rejects.toThrow(
      'Timeline source activityReport returned invalid presentation for sourceId 20'
    );
  });
});
