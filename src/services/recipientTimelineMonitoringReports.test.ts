import type { RecipientTimelineRequestParams } from '@ttahub/common/src/recipientTimeline';
import { Op } from 'sequelize';
import * as s3 from '../lib/s3';
import db from '../models';
import { getUniqueId } from '../testUtils';
import { getRecipientTimeline, queryTimelineEventIndex } from './recipientTimeline';
import { MONITORING_REPORT_TIMELINE_SOURCE } from './recipientTimelineSources';

const {
  CommunicationLog,
  CommunicationLogRecipient,
  DeliveredReview,
  Grant,
  GrantDeliveredReview,
  Recipient,
  Region,
  User,
  sequelize,
} = db;
const recipientIds = [getUniqueId(), getUniqueId()];
const regionIds = [getUniqueId(), getUniqueId()];
const grantIds = Array.from({ length: 4 }, () => getUniqueId());
const grantNumbers = grantIds.map((id) => `Timeline-${id}`);
const params: RecipientTimelineRequestParams = {
  recipientId: recipientIds[0],
  regionId: regionIds[0],
  limit: 100,
  offset: 0,
  sortBy: 'date',
  direction: 'desc',
  filters: [],
  excludeMultiRecipientCommunications: false,
};
const getTimeline = (overrides: Partial<RecipientTimelineRequestParams> = {}) =>
  getRecipientTimeline({ ...params, ...overrides }, { canReadCommunicationLogs: true });

beforeEach(() => {
  jest.spyOn(s3, 'getSignedDownloadUrl').mockReturnValue({ url: '', error: null });
});
afterEach(() => jest.restoreAllMocks());
afterAll(async () => sequelize.close());

describe('monitoring report timeline integration', () => {
  let reviews;
  let user;
  let log;

  beforeAll(async () => {
    await sequelize.transaction(async (transaction) => {
      await Promise.all([
        Region.bulkCreate(
          regionIds.map((id) => ({ id, name: `Timeline region ${id}` })),
          { transaction }
        ),
        Recipient.bulkCreate(
          recipientIds.map((id) => ({ id, name: `Timeline recipient ${id}` })),
          { transaction }
        ),
      ]);
      await Grant.bulkCreate(
        grantIds.map((id, index) => ({
          id,
          number: grantNumbers[index],
          recipientId: recipientIds[index === 2 ? 1 : 0],
          regionId: regionIds[index === 3 ? 1 : 0],
          status: 'Inactive',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        })),
        { transaction }
      );
      reviews = await DeliveredReview.bulkCreate(
        [
          { review_name: ' Review Alpha ', review_type: ' FA2 ', outcome: ' Non Compliant ' },
          { report_delivery_date: '2025-01-21', review_name: ' ', review_type: ' ', outcome: '' },
          { review_status: 'In Progress' },
          { report_delivery_date: null },
          { report_delivery_date: '2025-01-20' },
          {}, // Different recipient.
          {}, // Same recipient, different region.
          { deletedAt: new Date() },
          { review_uuid: null, report_delivery_date: '2027-01-01' },
          { review_type: null, report_delivery_date: '2027-01-02' },
        ].map((review) => ({
          id: getUniqueId(),
          mrid: getUniqueId(),
          review_uuid: `timeline-review-${getUniqueId()}`,
          review_type: 'FA2',
          review_status: 'Complete',
          report_delivery_date: '2026-05-21',
          ...review,
        })),
        { transaction }
      );
      await GrantDeliveredReview.bulkCreate(
        [
          ...reviews.map((review, index) => ({
            grantId: grantIds[index === 5 ? 2 : index === 6 ? 3 : 0],
            deliveredReviewId: review.id,
          })),
          // The review spans two own grants and grants outside this recipient/region.
          ...grantIds.slice(1).map((grantId) => ({ grantId, deliveredReviewId: reviews[0].id })),
        ],
        { transaction }
      );
      user = await User.create(
        {
          id: getUniqueId(),
          name: 'Timeline author',
          hsesUsername: `timeline-${getUniqueId()}`,
        },
        { transaction }
      );
      log = await CommunicationLog.create(
        {
          userId: user.id,
          data: { regionId: params.regionId, method: 'Email', communicationDate: '05/20/2026' },
        },
        { transaction }
      );
      await CommunicationLogRecipient.create(
        {
          communicationLogId: log.id,
          recipientId: params.recipientId,
        },
        { transaction }
      );
    });
  });

  afterAll(async () => {
    await sequelize.transaction(async (transaction) => {
      const reviewIds = reviews?.map(({ id }) => id) ?? [];
      await Promise.all([
        GrantDeliveredReview.destroy({ where: { deliveredReviewId: reviewIds }, transaction }),
        CommunicationLogRecipient.destroy({
          where: { communicationLogId: log?.id ?? [] },
          transaction,
        }),
      ]);
      await Promise.all([
        DeliveredReview.destroy({ where: { id: reviewIds }, force: true, transaction }),
        CommunicationLog.destroy({ where: { id: log?.id ?? [] }, transaction }),
      ]);
      await Grant.destroy({ where: { id: grantIds }, force: true, transaction });
      await Promise.all([
        User.destroy({ where: { id: user?.id ?? [] }, transaction }),
        Recipient.destroy({ where: { id: recipientIds }, transaction }),
        Region.destroy({ where: { id: regionIds }, transaction }),
      ]);
    });
  });

  it('includes only eligible reviews, including the cutoff and inactive grants, once per review', async () => {
    const result = await getTimeline();
    expect(result.count).toBe(3);
    expect(result.events.map(({ source, sourceId, date }) => ({ source, sourceId, date }))).toEqual(
      [
        { source: 'monitoringReport', sourceId: reviews[0].id, date: '2026-05-21' },
        { source: 'communicationLog', sourceId: log.id, date: '2026-05-20' },
        { source: 'monitoringReport', sourceId: reviews[1].id, date: '2025-01-21' },
      ]
    );
    expect(result.events[0]).toEqual({
      source: 'monitoringReport',
      sourceId: reviews[0].id,
      date: '2026-05-21',
      eventType: 'Monitoring report received',
      title: 'Monitoring report received',
      subtitle: 'Review Alpha',
      durationHours: null,
      byline: null,
      indicators: [],
      tags: [{ label: 'Monitoring', flagged: true }],
      details: [
        { label: 'Review type', items: [{ text: 'FA2' }] },
        { label: 'Outcome', items: [{ text: 'Non Compliant' }] },
        {
          label: 'Grant numbers',
          items: grantNumbers
            .slice(0, 2)
            .sort()
            .map((text) => ({ text })),
        },
      ],
      links: [
        {
          label: 'View monitoring review',
          to: `/recipient-tta-records/${params.recipientId}/region/${params.regionId}/monitoring/review`,
        },
      ],
    });
    expect(result.events[2]).toMatchObject({
      subtitle: null,
      details: [{ label: 'Grant numbers', items: [{ text: grantNumbers[0] }] }],
    });
  });

  it.each([
    ['review_uuid', '01/01/2027'],
    ['review_type', '01/02/2027'],
  ])('excludes reviews with missing %s before counting and pagination', async (_field, date) => {
    const result = await getTimeline({
      limit: 1,
      filters: [
        { topic: 'eventType', condition: 'is', query: ['Monitoring report received'] },
        { topic: 'date', condition: 'is on or after', query: date },
        { topic: 'date', condition: 'is on or before', query: date },
      ],
    });
    expect(result).toEqual({ count: 0, events: [] });
  });

  it.each(['is', 'is not'] as const)(
    'applies eventType %s before counting and paging',
    async (condition) => {
      const result = await getTimeline({
        limit: 1,
        filters: [{ topic: 'eventType', condition, query: ['Monitoring report received'] }],
      });
      expect(result.count).toBe(condition === 'is' ? 2 : 1);
      expect(result.events.map(({ source }) => source)).toEqual([
        condition === 'is' ? 'monitoringReport' : 'communicationLog',
      ]);
    }
  );

  it.each([
    ['is', ['Monitoring'], 2],
    ['is', ['Other'], 0],
    ['is not', ['Monitoring'], 0],
    ['is not', ['Other'], 2],
    ['is', ['Other', ' Monitoring '], 2],
    ['is not', ['Other', 'Monitoring'], 0],
  ] as const)('handles standard %s %j', async (condition, query, expected) => {
    const result = await getTimeline({
      filters: [
        { topic: 'eventType', condition: 'is', query: ['Monitoring report received'] },
        { topic: 'standard', condition, query: [...query] },
      ],
    });
    expect(result.count).toBe(expected);
    expect(result.events).toHaveLength(expected);
  });

  it('combines category filters and includes the review in the Monitoring view without goals', async () => {
    const result = await getTimeline({ view: 'monitoring' });
    expect(result.count).toBe(2);
    expect(result.categories).toEqual([{ label: 'Monitoring', statuses: [] }]);
    expect(result.events.every(({ source }) => source === 'monitoringReport')).toBe(true);
    const excluded = await getTimeline({
      filters: [
        { topic: 'standard', condition: 'is', query: ['Monitoring'] },
        { topic: 'standard', condition: 'is not', query: ['Monitoring'] },
      ],
    });
    expect(excluded).toMatchObject({ count: 0, events: [] });
  });

  it('interleaves other sources in both orders and applies inclusive date filters', async () => {
    const asc = await getTimeline({ direction: 'asc' });
    expect(asc.events.map(({ sourceId }) => sourceId)).toEqual([
      reviews[1].id,
      log.id,
      reviews[0].id,
    ]);
    const filtered = await getTimeline({
      filters: [
        { topic: 'date', condition: 'is on or after', query: '05/20/2026' },
        { topic: 'date', condition: 'is on or before', query: '05/21/2026' },
      ],
    });
    expect(filtered.count).toBe(2);
    expect(filtered.events.map(({ sourceId }) => sourceId)).toEqual([reviews[0].id, log.id]);
    const empty = await getTimeline({
      filters: [{ topic: 'date', condition: 'is on or before', query: '01/20/2025' }],
    });
    expect(empty).toEqual({ count: 0, events: [] });
  });

  it('treats SQL-like filter values as data', async () => {
    const result = await queryTimelineEventIndex({
      ...params,
      sources: [MONITORING_REPORT_TIMELINE_SOURCE],
      filters: [{ topic: 'standard', condition: 'is', query: ["Monitoring') OR TRUE --"] }],
    });
    expect(result).toEqual({ count: 0, events: [] });
  });
});

describe('monitoring report source contract', () => {
  it('does not load details for an empty page', async () => {
    const query = jest.spyOn(DeliveredReview, 'findAll');
    await expect(MONITORING_REPORT_TIMELINE_SOURCE.populate([], params)).resolves.toEqual(
      new Map()
    );
    expect(query).not.toHaveBeenCalled();
  });

  it.each([[], [''], [' '], [null], [1], 'Monitoring'].map((query) => [query]))(
    'rejects malformed standard values %j',
    (query) => {
      expect(() =>
        MONITORING_REPORT_TIMELINE_SOURCE.buildIndexQuery(
          {
            ...params,
            filters: [{ topic: 'standard', condition: 'is', query: query as never }],
          },
          { add: (name) => `:${name}` }
        )
      ).toThrow('Timeline standard filters require non-empty strings');
    }
  );

  it('populates only requested IDs without reapplying eligibility or filters', async () => {
    const query = jest
      .spyOn(DeliveredReview, 'findAll')
      .mockResolvedValue([{ id: 1, review_name: null, review_type: null, outcome: null }] as never);
    jest.spyOn(GrantDeliveredReview, 'findAll').mockResolvedValue([]);
    const result = await MONITORING_REPORT_TIMELINE_SOURCE.populate([1, 1], {
      ...params,
      filters: [{ topic: 'standard', condition: 'is', query: ['Other'] }],
    });
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { [Op.in]: [1] } } })
    );
    expect(result.get(1)).toMatchObject({ subtitle: null, details: [], byline: null });
  });
});
