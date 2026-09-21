import type { RecipientTimelineRequestParams } from '@ttahub/common/src/recipientTimeline';
import { sequelize } from '../models';
import { getRecipientTimeline } from './recipientTimeline';
import { RECIPIENT_TIMELINE_SOURCES } from './recipientTimelineSources';

jest.mock('../models', () => ({ sequelize: { query: jest.fn() } }));
jest.mock('./recipientTimelineSources', () => {
  const sources = ['activityReport', 'goalStatusChange', 'communicationLog'].map((name) => ({
    name,
    supportedFilterTopics: [],
    buildIndexQuery: jest.fn(() => `SELECT * FROM "${name}"`),
    populate: jest.fn(
      async () =>
        new Map([
          [
            1,
            {
              title: 'Event',
              subtitle: null,
              durationHours: null,
              byline: null,
              indicators: [],
              tags: [],
              details: [],
              links: [],
            },
          ],
        ])
    ),
  }));
  return {
    RECIPIENT_TIMELINE_SOURCES: sources,
    COMMUNICATION_LOG_TIMELINE_SOURCE: sources[2],
  };
});

const params: RecipientTimelineRequestParams = {
  recipientId: 1,
  regionId: 1,
  limit: 1,
  offset: 1,
  sortBy: 'date',
  direction: 'desc',
  filters: [],
  excludeMultiRecipientCommunications: false,
};

beforeEach(() => jest.clearAllMocks());

it.each([
  undefined,
  {},
  { canReadCommunicationLogs: false },
])('excludes communication logs from the count/page query and population without authorization (%j)', async (access) => {
  jest.mocked(sequelize.query).mockResolvedValue([
    {
      count: '2',
      source: 'goalStatusChange',
      sourceId: 1,
      date: '2026-01-01',
      eventType: 'Goal added',
    },
  ] as never);

  const result = await getRecipientTimeline(params, access);

  const [sql, options] = jest.mocked(sequelize.query).mock.calls[0];
  expect(sql).not.toContain('communicationLog');
  expect(sql).toContain('activityReport');
  expect(sql).toContain('goalStatusChange');
  expect(options).toMatchObject({ replacements: { timelineLimit: 1, timelineOffset: 1 } });
  expect(result).toMatchObject({ count: 2, events: [{ source: 'goalStatusChange' }] });
  expect(RECIPIENT_TIMELINE_SOURCES[2].buildIndexQuery).not.toHaveBeenCalled();
  expect(RECIPIENT_TIMELINE_SOURCES[2].populate).not.toHaveBeenCalled();
});

it('includes communication logs in indexing and population when authorized', async () => {
  jest.mocked(sequelize.query).mockResolvedValue([
    {
      count: '3',
      source: 'communicationLog',
      sourceId: 1,
      date: '2026-01-01',
      eventType: 'Email communication',
    },
  ] as never);

  const result = await getRecipientTimeline(params, { canReadCommunicationLogs: true });

  expect(jest.mocked(sequelize.query).mock.calls[0][0]).toContain('communicationLog');
  expect(RECIPIENT_TIMELINE_SOURCES[2].populate).toHaveBeenCalledWith([1], params);
  expect(result).toMatchObject({ count: 3, events: [{ source: 'communicationLog' }] });
});
