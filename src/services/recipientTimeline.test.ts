import type {
  RecipientTimelineEventPresentation,
  RecipientTimelineRequestParams,
} from '@ttahub/common/src/recipientTimeline';
import { sequelize } from '../models';
import {
  populateTimelineEventIndex,
  queryTimelineEventIndex,
  type TimelineIndexResponse,
  timelineEventIndexHasEvents,
} from './recipientTimeline';
import type { TimelineEventSource } from './recipientTimelineSources';

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
  populate: async () => presentations,
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

  it.each(['UTC', 'America/Los_Angeles', 'Asia/Tokyo'])(
    'keeps mixed-source dates, ordering, and pagination stable in the %s session timezone',
    async (timeZone) => {
      const sources = [
        source(
          'activityReport',
          `SELECT 1 AS "sourceId", DATE '2026-08-22' AS "date",
            'TTA activity' AS "eventType", 100000 AS "recipientId", 1 AS "regionId"`
        ),
        source(
          'goalStatusChange',
          `SELECT * FROM (VALUES
            (10, TIMESTAMPTZ '2026-08-21T23:30:00Z', 'Goal added', 100000, 1),
            (11, TIMESTAMPTZ '2026-08-22T01:00:00Z', 'Goal suspended', 100000, 1),
            (12, TIMESTAMPTZ '2026-08-22T03:30:00+02:00', 'Goal reopened', 100000, 1),
            (13, TIMESTAMPTZ '2026-08-22T23:30:00Z', 'Goal closed', 100000, 1)
          ) AS "event"("sourceId", "date", "eventType", "recipientId", "regionId")`
        ),
        source(
          'communicationLog',
          `SELECT 20 AS "sourceId", TIMESTAMP '2026-08-22 00:30:00' AS "date",
            'Email communication' AS "eventType", 100000 AS "recipientId", 1 AS "regionId"`
        ),
      ];

      await sequelize.transaction(async (transaction) => {
        // Transaction-local settings cannot leak into other tests through the connection pool.
        await sequelize.query("SELECT set_config('TimeZone', :timeZone, true)", {
          replacements: { timeZone },
          transaction,
        });
        const descending = await queryTestTimeline(timelineParams, sources);
        expect(descending.count).toBe(6);
        expect(descending.events.map(({ sourceId, date }) => [sourceId, date])).toEqual([
          [13, '2026-08-22'],
          [12, '2026-08-22'],
          [11, '2026-08-22'],
          [20, '2026-08-22'],
          [1, '2026-08-22'],
          [10, '2026-08-21'],
        ]);
        const ascending = await queryTestTimeline({ ...timelineParams, direction: 'asc' }, sources);
        expect(ascending.events).toEqual([...descending.events].reverse());
        const page = await queryTestTimeline({ ...timelineParams, limit: 2, offset: 2 }, sources);
        expect(page).toEqual({
          count: 6,
          events: descending.events.slice(2, 4),
          nextCursor: expect.any(String),
        });
        const filtered = await queryTestTimeline(
          {
            ...timelineParams,
            filters: [{ topic: 'date', condition: 'is within', query: '2026/08/22-2026/08/22' }],
          },
          sources
        );
        expect(filtered).toEqual({ count: 5, events: descending.events.slice(0, 5) });
      });
    }
  );

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

  it.each(['asc', 'desc'] as const)(
    'combines inclusive date bounds across all four sources before paging in %s order',
    async (direction) => {
      const sources = [
        ['activityReport', 'TTA activity'],
        ['communicationLog', 'Email communication'],
        ['goalStatusChange', 'Goal added'],
        ['sessionReport', 'Training session'],
      ].map(([name, eventType]) =>
        source(
          name,
          `SELECT * FROM (VALUES
            (1, DATE '2026-08-19', '${eventType}', 100000, 1),
            (2, DATE '2026-08-20', '${eventType}', 100000, 1),
            (3, DATE '2026-08-21', '${eventType}', 100000, 1),
            (4, DATE '2026-08-22', '${eventType}', 100000, 1)
          ) AS "event"("sourceId", "date", "eventType", "recipientId", "regionId")`
        )
      );
      const filteredParams: RecipientTimelineRequestParams = {
        ...timelineParams,
        direction,
        filters: [
          { topic: 'date', condition: 'is on or after', query: '08/20/2026' },
          { topic: 'date', condition: 'is on or before', query: '08/21/2026' },
        ],
      };
      const expected = (direction === 'asc' ? [2, 3] : [3, 2]).flatMap((sourceId) =>
        sources.map(({ name }) => [name, sourceId])
      );
      const pages = await Promise.all(
        [0, 3, 6, 9].map((offset) =>
          queryTestTimeline({ ...filteredParams, limit: 3, offset }, sources)
        )
      );
      expect(pages.map(({ count }) => count)).toEqual([8, 8, 8, 8]);
      expect(
        pages.flatMap(({ events }) => events.map(({ source, sourceId }) => [source, sourceId]))
      ).toEqual(expected);
      expect(pages[3].events).toEqual([]);
      const range = await queryTestTimeline(
        {
          ...filteredParams,
          filters: [{ topic: 'date', condition: 'is within', query: '08/20/2026-08/21/2026' }],
        },
        sources
      );
      expect(range.events).toEqual(pages.flatMap(({ events }) => events));
    }
  );

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

  describe('event existence', () => {
    const hasEvents = (overrides: Partial<RecipientTimelineRequestParams> = {}) =>
      timelineEventIndexHasEvents({ ...timelineParams, ...overrides, sources: timelineSources });

    it('is true when any event matches and false when none do', async () => {
      expect(await hasEvents()).toBe(true);
      expect(
        await hasEvents({
          filters: [{ topic: 'eventType', condition: 'is', query: ['TTA activity'] }],
        })
      ).toBe(true);
      expect(
        await hasEvents({
          filters: [{ topic: 'date', condition: 'is on or after', query: '01/01/2030' }],
        })
      ).toBe(false);
      expect(await hasEvents({ recipientId: 999999 })).toBe(false);
    });

    it('agrees with the total count of the paged query', async () => {
      const filters = [
        { topic: 'date' as const, condition: 'is on or after' as const, query: '08/22/2026' },
      ];
      const { count } = await queryTestTimeline({ ...timelineParams, filters });
      expect(count > 0).toBe(await hasEvents({ filters }));
    });

    it('has no events without sources', async () => {
      expect(await timelineEventIndexHasEvents({ ...timelineParams, sources: [] })).toBe(false);
    });
  });

  describe('cursor pagination', () => {
    const walk = async (
      params: RecipientTimelineRequestParams,
      sources: readonly TimelineEventSource[] = timelineSources
    ) => {
      const pages = [];
      let cursor: string | undefined;
      do {
        const page = await queryTestTimeline({ ...params, cursor }, sources);
        pages.push(page);
        cursor = page.nextCursor;
      } while (cursor);
      return pages;
    };
    const rows = (ids: number[]) =>
      source(
        'communicationLog',
        `SELECT * FROM (VALUES ${ids
          .map((id) => `(${id}, DATE '2026-08-${10 + (id % 3)}', 'Email communication', 100000, 1)`)
          .join(', ')}
        ) AS "event"("sourceId", "date", "eventType", "recipientId", "regionId")`
      );

    it.each(['asc', 'desc'] as const)(
      'visits every event once in %s order, including ties on the same date',
      async (direction) => {
        const all = await queryTestTimeline({ ...timelineParams, direction, limit: 100 });
        expect(all.nextCursor).toBeUndefined();
        const pages = await walk({ ...timelineParams, direction, limit: 2 });
        expect(pages.map(({ events }) => events.length)).toEqual([2, 2, 1]);
        expect(pages.flatMap(({ events }) => events)).toEqual(all.events);
        expect(pages.every(({ count }) => count === 5)).toBe(true);
        expect(pages[pages.length - 1].nextCursor).toBeUndefined();
      }
    );

    it('does not offer a next page when the last page is exactly full', async () => {
      const page = await queryTestTimeline({ ...timelineParams, limit: 5 });
      expect(page.events).toHaveLength(5);
      expect(page.nextCursor).toBeUndefined();
    });

    it('does not skip an event when a loaded event is deleted before the next page', async () => {
      const before = rows([1, 2, 3, 4, 5, 6]);
      const first = await queryTestTimeline({ ...timelineParams, limit: 3 }, [before]);
      const unchanged = await queryTestTimeline(
        { ...timelineParams, limit: 3, cursor: first.nextCursor },
        [before]
      );
      // Delete the first event on the page already loaded.
      const afterDelete = await queryTestTimeline(
        { ...timelineParams, limit: 3, cursor: first.nextCursor },
        [rows([2, 3, 4, 5, 6])]
      );
      expect(afterDelete.events).toEqual(unchanged.events);
      expect(afterDelete.count).toBe(5);
    });

    it('does not repeat or shift events when one is added ahead of the cursor', async () => {
      const dated = (entries: Array<[number, string]>) =>
        source(
          'communicationLog',
          `SELECT * FROM (VALUES ${entries
            .map(([id, date]) => `(${id}, DATE '${date}', 'Email communication', 100000, 1)`)
            .join(', ')}
          ) AS "event"("sourceId", "date", "eventType", "recipientId", "regionId")`
        );
      const base: Array<[number, string]> = [
        [1, '2026-08-15'],
        [2, '2026-08-14'],
        [3, '2026-08-13'],
        [4, '2026-08-12'],
        [5, '2026-08-11'],
      ];
      const first = await queryTestTimeline({ ...timelineParams, limit: 2 }, [dated(base)]);
      expect(first.events.map(({ sourceId }) => sourceId)).toEqual([1, 2]);
      // A newer event appears above the loaded page; offsets would repeat event 2 here.
      const next = await queryTestTimeline(
        { ...timelineParams, limit: 2, cursor: first.nextCursor },
        [dated([[9, '2026-08-16'], ...base])]
      );
      expect(next.events.map(({ sourceId }) => sourceId)).toEqual([3, 4]);
      expect(next.count).toBe(6);
    });

    it('keeps sub-millisecond timestamps in the cursor', async () => {
      const microsecondSource = source(
        'goalStatusChange',
        `SELECT * FROM (VALUES
          (1, TIMESTAMPTZ '2026-08-22 10:00:00.000123+00', 'Goal added', 100000, 1),
          (2, TIMESTAMPTZ '2026-08-22 10:00:00.000456+00', 'Goal added', 100000, 1),
          (3, TIMESTAMPTZ '2026-08-22 10:00:00.000789+00', 'Goal added', 100000, 1)
        ) AS "event"("sourceId", "date", "eventType", "recipientId", "regionId")`
      );
      const pages = await walk({ ...timelineParams, limit: 1 }, [microsecondSource]);
      expect(pages.flatMap(({ events }) => events.map(({ sourceId }) => sourceId))).toEqual([
        3, 2, 1,
      ]);
    });

    it.each([
      ['not base64 json', 'not-a-cursor'],
      ['wrong shape', Buffer.from(JSON.stringify({ a: 1 })).toString('base64url')],
      [
        'a malformed timestamp',
        Buffer.from(
          JSON.stringify(["2026-08-22'; DROP TABLE x --", 'communicationLog', 1])
        ).toString('base64url'),
      ],
      ...[
        '2026-99-99 10:00:00',
        '2026-02-30 10:00:00',
        '2026-08-22 25:00:00',
        '2026-08-22 10:61:00',
        '2026-08-22T10:00:61.123456',
        '0000-01-01 10:00:00',
      ].map((occurredAt) => [
        `an out of range timestamp (${occurredAt})`,
        Buffer.from(JSON.stringify([occurredAt, 'communicationLog', 1])).toString('base64url'),
      ]),
      [
        'an unsafe source name',
        Buffer.from(JSON.stringify(['2026-08-22 10:00:00', 'a b', 1])).toString('base64url'),
      ],
      [
        'a non-integer id',
        Buffer.from(JSON.stringify(['2026-08-22 10:00:00', 'communicationLog', '1'])).toString(
          'base64url'
        ),
      ],
    ])('rejects a cursor that is %s', async (_description, cursor) => {
      await expect(queryTestTimeline({ ...timelineParams, cursor })).rejects.toMatchObject({
        statusCode: 400,
        message: 'Timeline cursor is invalid',
      });
    });

    it('rejects a cursor combined with an offset', async () => {
      const first = await queryTestTimeline({ ...timelineParams, limit: 2 });
      await expect(
        queryTestTimeline({ ...timelineParams, offset: 2, cursor: first.nextCursor })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Timeline cursor cannot be combined with offset',
      });
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
      populate: async () => new Map(),
    };

    const result = await queryTestTimeline(timelineParams, [namespacedSource]);
    expect(result.events[0].eventType).toBe('TTA activity');
  });

  it.each([
    {
      description: 'an unsupported source-specific filter',
      params: {
        ...timelineParams,
        filters: [{ topic: 'unknown', condition: 'is', query: ['Follow-up'] }],
      },
      error: 'Recipient timeline filter is not supported: unknown',
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

  it.each([['Unknown purpose'], [null], [42], ["General Check-In') OR TRUE --"]])(
    'rejects invalid purposes for direct service callers: %j',
    async (purpose) => {
      await expect(
        queryTestTimeline({
          ...timelineParams,
          filters: [{ topic: 'purpose', condition: 'is', query: [purpose] }],
        } as RecipientTimelineRequestParams)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Timeline purpose filter contains an unsupported communication purpose',
      });
    }
  );

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

describe('populateTimelineEventIndex', () => {
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

  it('restores index order and protects authoritative fields from source output', async () => {
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

    const result = await populateTimelineEventIndex(index, timelineParams, sources);

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

  it('fails rather than silently dropping a missing population result', async () => {
    const sources = [
      source('activityReport', 'SELECT 1', new Map()),
      source('communicationLog', 'SELECT 1', new Map([[10, presentation('Email')]])),
    ];

    await expect(populateTimelineEventIndex(index, timelineParams, sources)).rejects.toThrow(
      'Timeline source activityReport did not populate sourceId 20'
    );
  });

  it('fails when a source returns an unexpected ID', async () => {
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

    await expect(populateTimelineEventIndex(index, timelineParams, sources)).rejects.toThrow(
      'Timeline source activityReport populated unexpected sourceId 21'
    );
  });

  it.each([
    ['a negative duration', { durationHours: -1 }],
    ['a blank title', { title: ' ' }],
    ['a non-string subtitle', { subtitle: 1 }],
    ['a blank subtitle', { subtitle: ' ' }],
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
      populateTimelineEventIndex(singleEventIndex, timelineParams, sources)
    ).rejects.toThrow(
      'Timeline source activityReport returned invalid presentation for sourceId 20'
    );
  });
});
