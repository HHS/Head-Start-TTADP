import { TTA_REQUEST_STATUSES } from '@ttahub/common';
import type { RecipientTimelineRequestParams } from '@ttahub/common/src/recipientTimeline';
import { Op } from 'sequelize';
import * as s3 from '../lib/s3';
import db from '../models';
import { getUniqueId } from '../testUtils';
import { getRecipientTimeline, queryTimelineEventIndex } from './recipientTimeline';
import { TTA_REQUEST_TIMELINE_SOURCE } from './recipientTimelineSources';

const {
  CommunicationLog,
  CommunicationLogRecipient,
  GoalTemplate,
  Recipient,
  Region,
  Role,
  TtaRequest,
  User,
  UserRole,
  sequelize,
} = db;
const recipientIds = [getUniqueId(), getUniqueId()];
const regionIds = [getUniqueId(), getUniqueId()];
const standard = `Timeline request ${getUniqueId()}`;
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
const getTimeline = (
  overrides: Partial<RecipientTimelineRequestParams> = {},
  canReadTtaRequests = true
) =>
  getRecipientTimeline(
    { ...params, ...overrides },
    { canReadCommunicationLogs: true, canReadTtaRequests }
  );

beforeEach(() => {
  jest.spyOn(s3, 'getSignedDownloadUrl').mockReturnValue({ url: '', error: null });
});
afterEach(() => jest.restoreAllMocks());
afterAll(async () => sequelize.close());

describe('TTA request timeline integration', () => {
  let requests;
  let creator;
  let roles;
  let templates;
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
      [creator, roles, templates] = await Promise.all([
        User.create(
          { id: getUniqueId(), name: 'Jane Hooper', hsesUsername: `timeline-${getUniqueId()}` },
          { transaction }
        ),
        Role.bulkCreate(
          [false, true].map((retired) => ({
            id: getUniqueId(),
            name: `Timeline-role-${getUniqueId()}`,
            fullName: 'Timeline role',
            isSpecialist: true,
            deletedAt: retired ? new Date() : null,
          })),
          { transaction }
        ),
        // Generated, globally unique standards: create isolated categories instead of using seeds.
        GoalTemplate.bulkCreate(
          [standard, `Deleted ${getUniqueId()}`].map((category, index) => ({
            id: getUniqueId(),
            templateName: `(${category}) Timeline request goal`,
            creationMethod: 'Curated',
            hash: `timeline-${getUniqueId()}`,
            templateNameModifiedAt: new Date(),
            deletedAt: index ? new Date() : null,
          })),
          { transaction }
        ),
      ]);
      await UserRole.bulkCreate(
        roles.map(({ id }) => ({ roleId: id, userId: creator.id })),
        { transaction }
      );
      requests = await TtaRequest.bulkCreate(
        [
          {
            goalTemplateId: templates[0].id,
            originator: 'Regional Office',
            context: '<p>First &amp; second.</p><p>Follow up</p>',
            recipientAware: true,
          },
          { submittedAt: '2026-05-21T10:00:00Z', recipientAware: false },
          { status: TTA_REQUEST_STATUSES.DRAFT },
          { submittedAt: null },
          { recipientId: recipientIds[1] },
          { regionId: regionIds[1] },
          { recipientId: null },
          { deletedAt: new Date() },
          { submittedAt: '2026-05-20T23:00:00Z', goalTemplateId: templates[1].id },
        ].map((request) => ({
          id: getUniqueId(),
          userId: creator.id,
          lastUpdatedById: creator.id,
          recipientId: params.recipientId,
          regionId: params.regionId,
          status: TTA_REQUEST_STATUSES.SUBMITTED,
          submittedAt: '2026-05-21T12:00:00Z',
          ...request,
        })),
        { transaction }
      );
      log = await CommunicationLog.create(
        {
          userId: creator.id,
          data: { regionId: params.regionId, method: 'Email', communicationDate: '05/21/2026' },
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
      await Promise.all([
        TtaRequest.destroy({
          where: { id: requests?.map(({ id }) => id) ?? [] },
          force: true,
          transaction,
        }),
        CommunicationLogRecipient.destroy({
          where: { communicationLogId: log?.id ?? [] },
          transaction,
        }),
        UserRole.destroy({ where: { userId: creator?.id ?? [] }, transaction }),
      ]);
      await CommunicationLog.destroy({ where: { id: log?.id ?? [] }, transaction });
      await Promise.all([
        GoalTemplate.destroy({
          where: { id: templates?.map(({ id }) => id) ?? [] },
          force: true,
          transaction,
        }),
        Role.destroy({ where: { id: roles?.map(({ id }) => id) ?? [] }, force: true, transaction }),
        User.destroy({ where: { id: creator?.id ?? [] }, transaction }),
        Recipient.destroy({ where: { id: recipientIds }, transaction }),
        Region.destroy({ where: { id: regionIds }, transaction }),
      ]);
    });
  });

  it('indexes only submitted, dated, undeleted requests for this recipient and region', async () => {
    const result = await getTimeline();
    expect(result.count).toBe(4);
    expect(result.events.map(({ sourceId }) => sourceId)).toEqual([
      requests[0].id,
      requests[1].id,
      log.id,
      requests[8].id,
    ]);
    expect(result.events[0]).toEqual({
      source: 'ttaRequest',
      sourceId: requests[0].id,
      date: '2026-05-21',
      eventType: 'TTA request',
      title: 'TTA request',
      subtitle: `R${params.regionId}-REQ-${requests[0].id}`,
      durationHours: null,
      byline: { label: 'By', values: [`Jane Hooper, ${roles[0].name}`] },
      indicators: [],
      tags: [{ label: standard, flagged: false }],
      details: [
        { label: 'Originator', items: [{ text: 'Regional Office' }] },
        { label: 'Context', items: [{ text: 'First & second.\n\nFollow up' }] },
        { label: 'Recipient aware', items: [{ text: 'Yes' }] },
      ],
      links: [
        {
          label: 'View TTA request',
          to: `/recipient-tta-records/${params.recipientId}/region/${params.regionId}/tta-request/view/${requests[0].id}`,
        },
      ],
    });
    expect(result.events[1]).toMatchObject({
      tags: [],
      details: [{ label: 'Recipient aware', items: [{ text: 'No' }] }],
    });
    expect(result.events[3]).toMatchObject({ tags: [], details: [] });
  });

  it.each(['is', 'is not'] as const)('handles eventType %s', async (condition) => {
    const result = await getTimeline({
      filters: [{ topic: 'eventType', condition, query: ['TTA request'] }],
    });
    expect(result.count).toBe(condition === 'is' ? 3 : 1);
    expect(
      result.events.every(({ source }) =>
        condition === 'is' ? source === 'ttaRequest' : source !== 'ttaRequest'
      )
    ).toBe(true);
  });

  it.each([
    ['is', [standard], [0]],
    ['is not', [standard], [1, 8]],
    ['is', ['Other'], []],
    ['is not', ['Other'], [0, 1, 8]],
    ['is', ['Other', ` ${standard} `], [0]],
    ['is not', ['Other', standard], [1, 8]],
  ] as const)(
    'handles standard %s %j, including uncategorized and deleted-template requests',
    async (condition, query, expected) => {
      const result = await getTimeline({
        filters: [
          { topic: 'eventType', condition: 'is', query: ['TTA request'] },
          { topic: 'standard', condition, query: [...query] },
        ],
      });
      expect(result.count).toBe(expected.length);
      expect(result.events.map(({ sourceId }) => sourceId)).toEqual(
        expected.map((index) => requests[index].id)
      );
    }
  );

  it('applies every category predicate rather than just the first', async () => {
    const result = await getTimeline({
      filters: [
        { topic: 'standard', condition: 'is', query: [standard] },
        { topic: 'standard', condition: 'is not', query: [standard] },
      ],
    });
    expect(result).toEqual({ count: 0, events: [] });
  });

  it('removes unauthorized requests before counting, paging, and population', async () => {
    const requestQuery = jest.spyOn(TtaRequest, 'findAll');
    const result = await getTimeline({ limit: 1 }, false);
    expect(result).toMatchObject({
      count: 1,
      events: [{ source: 'communicationLog', sourceId: log.id }],
    });
    expect(requestQuery).not.toHaveBeenCalled();
    const filtered = await getTimeline(
      { filters: [{ topic: 'eventType', condition: 'is', query: ['TTA request'] }] },
      false
    );
    expect(filtered).toEqual({ count: 0, events: [] });
  });

  it('preserves submission times when paging and sorting the same date across sources', async () => {
    const pages = await Promise.all(
      [0, 1, 2, 3, 4].map((offset) => getTimeline({ limit: 1, offset }))
    );
    expect(pages.map(({ count }) => count)).toEqual([4, 4, 4, 4, 4]);
    expect(pages.flatMap(({ events }) => events.map(({ sourceId }) => sourceId))).toEqual([
      requests[0].id,
      requests[1].id,
      log.id,
      requests[8].id,
    ]);
    const asc = await getTimeline({ direction: 'asc' });
    expect(asc.events.map(({ sourceId }) => sourceId)).toEqual([
      requests[8].id,
      log.id,
      requests[1].id,
      requests[0].id,
    ]);
    const filtered = await getTimeline({
      filters: [
        { topic: 'date', condition: 'is on or after', query: '05/21/2026' },
        { topic: 'date', condition: 'is on or before', query: '05/21/2026' },
      ],
    });
    expect(filtered.count).toBe(3);
    expect(filtered.events.map(({ sourceId }) => sourceId)).toEqual([
      requests[0].id,
      requests[1].id,
      log.id,
    ]);
  });

  it('treats SQL-like standard values as data', async () => {
    const result = await queryTimelineEventIndex({
      ...params,
      sources: [TTA_REQUEST_TIMELINE_SOURCE],
      filters: [{ topic: 'standard', condition: 'is', query: ["Monitoring') OR TRUE --"] }],
    });
    expect(result).toEqual({ count: 0, events: [] });
  });
});

describe('TTA request source contract', () => {
  it('does not load details for an empty page', async () => {
    const query = jest.spyOn(TtaRequest, 'findAll');
    await expect(TTA_REQUEST_TIMELINE_SOURCE.populate([], params)).resolves.toEqual(new Map());
    expect(query).not.toHaveBeenCalled();
  });

  it.each([[], [''], [' '], [null], [1], 'Monitoring'].map((query) => [query]))(
    'rejects malformed standard values %j',
    (query) => {
      expect(() =>
        TTA_REQUEST_TIMELINE_SOURCE.buildIndexQuery(
          {
            ...params,
            filters: [{ topic: 'standard', condition: 'is', query: query as never }],
          },
          { add: (name) => `:${name}` }
        )
      ).toThrow('Timeline standard filters require non-empty strings');
    }
  );

  it('flags Monitoring and tolerates missing creators and blank optional fields', async () => {
    const query = jest.spyOn(TtaRequest, 'findAll').mockResolvedValue([
      {
        id: 1,
        creator: null,
        goalTemplate: { standard: 'Monitoring' },
        originator: ' ',
        context: '<p> </p>',
        recipientAware: null,
        displayId: 'R01-REQ-1',
      },
      {
        id: 2,
        creator: { name: ' Jane ', roles: [] },
        goalTemplate: null,
        context: 'Plain text',
        recipientAware: false,
      },
    ] as never);
    const result = await TTA_REQUEST_TIMELINE_SOURCE.populate([1, 1, 2], {
      ...params,
      filters: [{ topic: 'standard', condition: 'is', query: ['Other'] }],
    });
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { [Op.in]: [1, 2] } } })
    );
    expect(result.get(1)).toMatchObject({
      byline: null,
      tags: [{ label: 'Monitoring', flagged: true }],
      details: [],
    });
    expect(result.get(2)).toMatchObject({
      subtitle: null,
      byline: { label: 'By', values: ['Jane'] },
      tags: [],
      details: [
        { label: 'Context', items: [{ text: 'Plain text' }] },
        { label: 'Recipient aware', items: [{ text: 'No' }] },
      ],
    });
  });
});
