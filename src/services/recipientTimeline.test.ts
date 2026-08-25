import { getRecipientTimeline, queryTimelineEventIndex } from './recipientTimeline';
import type { TimelineEventSource } from './recipientTimelineSources';

const timelineParams = {
  recipientId: 100000,
  regionId: 1,
  limit: 20,
  offset: 0,
  sortBy: 'date' as const,
  direction: 'desc' as const,
  filters: [],
  excludeMultiRecipientCommunications: false,
};

const timelineSources: TimelineEventSource[] = [
  {
    name: 'activityReport',
    query: `
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
        ON "eventGrant"."sourceId" = "event"."sourceId"`,
  },
  {
    name: 'communicationLog',
    query: `
      SELECT *
      FROM (
        VALUES
          (101, DATE '2026-08-21', 'Email communication', 100000, 1),
          (201, DATE '2026-08-19', 'Phone communication', 100000, 1),
          (202, DATE '2026-08-22', 'Phone communication', 200000, 1),
          (203, DATE '2026-08-22', 'Phone communication', 100000, 2)
      ) AS "event"("sourceId", "date", "eventType", "recipientId", "regionId")`,
  },
];

const queryTestTimeline = (
  params: typeof timelineParams,
  sources: readonly TimelineEventSource[] = timelineSources
) =>
  queryTimelineEventIndex({
    sources,
    recipientId: params.recipientId,
    regionId: params.regionId,
    limit: params.limit,
    offset: params.offset,
    direction: params.direction,
  });

describe('getRecipientTimeline', () => {
  it('returns the empty timeline contract when there are no event sources', async () => {
    const result = await getRecipientTimeline(timelineParams);

    expect(result).toEqual({
      count: 0,
      events: [],
    });
  });

  it('rejects source names that differ only by surrounding whitespace', async () => {
    await expect(
      queryTestTimeline(timelineParams, [
        timelineSources[0],
        {
          ...timelineSources[1],
          name: `${timelineSources[0].name} `,
        },
      ])
    ).rejects.toThrow(
      'Timeline event sources must have unique, whitespace-trimmed names and non-empty queries'
    );
  });

  it('returns page 1 with a distinct count and deterministic equal-date ordering', async () => {
    const result = await queryTestTimeline(
      {
        ...timelineParams,
        limit: 2,
      },
      timelineSources
    );

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

  it('excludes source rows outside the requested recipient and region', async () => {
    const result = await queryTestTimeline(
      {
        ...timelineParams,
        limit: 10,
      },
      timelineSources
    );

    expect(result.count).toBe(5);
    expect(result.events.map(({ sourceId }) => sourceId)).toEqual([101, 101, 102, 103, 201]);
    expect(result.events.map(({ sourceId }) => sourceId)).not.toEqual(
      expect.arrayContaining([104, 105, 202, 203])
    );
  });

  it('returns the next event slice without repeating a multi-grant event', async () => {
    const result = await queryTestTimeline(
      {
        ...timelineParams,
        limit: 2,
        offset: 2,
      },
      timelineSources
    );

    expect(result.count).toBe(5);
    expect(result.events).toEqual([
      {
        source: 'activityReport',
        sourceId: 102,
        date: '2026-08-20',
        eventType: 'TTA activity',
      },
      {
        source: 'activityReport',
        sourceId: 103,
        date: '2026-08-20',
        eventType: 'TTA activity',
      },
    ]);
    expect(result.events.filter(({ sourceId }) => sourceId === 101)).toHaveLength(0);
  });

  it('returns the count when the requested event slice is empty', async () => {
    const result = await queryTestTimeline(
      {
        ...timelineParams,
        limit: 2,
        offset: 20,
      },
      timelineSources
    );

    expect(result).toEqual({
      count: 5,
      events: [],
    });
  });

  it('rejects source rows with unsupported event types', async () => {
    await expect(
      queryTestTimeline(
        {
          ...timelineParams,
          limit: 1,
        },
        [
          {
            name: 'badSource',
            query: `
              SELECT *
              FROM (
                VALUES
                  (301, DATE '2026-08-21', 'Typo activity', 100000, 1)
              ) AS "event"("sourceId", "date", "eventType", "recipientId", "regionId")`,
          },
        ]
      )
    ).rejects.toThrow('Timeline source returned unsupported eventType: Typo activity');
  });
});
