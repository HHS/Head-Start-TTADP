import type { RecipientTimelineRequestParams } from '@ttahub/common/src/recipientTimeline';
import express from 'express';
import httpContext from 'express-http-context';
import { Op, QueryTypes } from 'sequelize';
import request from 'supertest';
import * as s3 from '../lib/s3';
import db from '../models';
import recipientRouter from '../routes/recipient';
import { getUniqueId } from '../testUtils';
import { getRecipientTimeline, queryTimelineEventIndex } from './recipientTimeline';
import { COMMUNICATION_LOG_TIMELINE_SOURCE } from './recipientTimelineSources';

// Exercise the real route, transaction wrapper, index, and population queries. Authorization is
// covered by recipient route tests; these fixtures only need permission to read their region.
jest.mock('../routes/utils', () => ({
  checkRecipientAccessAndExistence: jest.fn().mockResolvedValue(true),
}));

const {
  CommunicationLog,
  CommunicationLogRecipient,
  CommunicationLogFile,
  File,
  Recipient,
  Region,
  User,
  Role,
  UserRole,
  RequestErrors,
  sequelize,
} = db;
const recipientIds = [getUniqueId(), getUniqueId(), getUniqueId()];
const regionIds = [getUniqueId(), getUniqueId()];
const customStandard = `Timeline standard ${getUniqueId()}`;
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

beforeEach(() => {
  jest.spyOn(s3, 'getSignedDownloadUrl').mockImplementation((key) => ({
    url: `https://attachments.example/${key}`,
    error: null,
  }));
});
afterEach(() => jest.restoreAllMocks());
afterAll(async () => sequelize.close());

describe('communication log timeline integration', () => {
  const app = express();
  app.use(httpContext.middleware);
  app.use('/recipient', recipientRouter);
  let logs;
  let files;
  let user;
  let role;

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
      user = await User.create(
        { name: 'Jane Hooper', hsesUsername: `timeline-${getUniqueId()}` },
        { transaction }
      );
      // Seeded roles have fixed IDs without advancing Roles_id_seq. Use an isolated test ID.
      role = await Role.create(
        {
          id: getUniqueId(),
          name: `Timeline-${getUniqueId()}`,
          fullName: 'Timeline test role',
          isSpecialist: true,
        },
        { transaction }
      );
      await UserRole.create({ userId: user.id, roleId: role.id }, { transaction });
      // Dates deliberately disagree with insertion/creation order, and cross a year boundary.
      logs = await CommunicationLog.bulkCreate(
        [
          {
            communicationDate: '12/31/2025',
            method: 'Email',
            duration: '0.25',
            purpose: ' General check-in ',
            result: ' Next Steps identified ',
            goals: [{ label: ' Monitoring ' }, { label: customStandard }, { label: 'Monitoring' }],
            notes:
              '<p>First &amp; second.</p><p>Another paragraph.</p><ul><li>Follow up</li><li>Review</li></ul>',
            otherStaff: [{ label: 'Must not appear in byline' }],
            specialistNextSteps: [{ note: 'Not a card section', completeDate: '01/01/2026' }],
            recipientNextSteps: [{ note: 'Not a card section', completeDate: '01/01/2026' }],
            recipients: [{ value: recipientIds[0] }, { value: recipientIds[1] }],
          },
          { communicationDate: '01/02/2026', method: 'Phone', duration: 1 },
          {
            communicationDate: '01/01/2026',
            method: 'In person',
            regionId: String(regionIds[0]),
            goals: [{ label: 'Monitoring' }],
            recipients: [{ value: recipientIds[0] }],
          },
          { communicationDate: '01/02/2026', method: ' Virtual ' },
          { communicationDate: '' },
          { communicationDate: null },
          { communicationDate: undefined },
          { communicationDate: ' \t\r\n ' },
          { method: '' },
          { method: 'SMS' },
          { method: undefined },
          { method: null },
          {}, // Other recipient only.
          { regionId: regionIds[1] }, // Same recipient, different region.
          { regionId: 'invalid' }, // Malformed region data must not cause a cast failure.
        ].map((data) => ({
          userId: user.id,
          createdAt: '2027-01-01T12:00:00Z',
          data: {
            regionId: regionIds[0],
            communicationDate: '02/01/2026',
            method: 'Email',
            ...data,
          },
        })),
        { transaction }
      );
      await CommunicationLogRecipient.bulkCreate(
        [
          ...logs.map((log, index) => ({
            communicationLogId: log.id,
            recipientId: recipientIds[index === 12 ? 2 : 0],
          })),
          ...[2, 3].map((index) => ({
            communicationLogId: logs[index].id,
            recipientId: recipientIds[1],
          })),
        ],
        { transaction }
      );
      files = await File.bulkCreate(
        [
          { originalFileName: 'Summary.pdf', status: 'APPROVED' },
          { originalFileName: 'Agenda.pdf', status: 'APPROVED' },
          { originalFileName: 'Rejected.pdf', status: 'REJECTED' },
          { originalFileName: 'Scanning.pdf', status: 'SCANNING' },
          { originalFileName: 'Other recipient.pdf', status: 'APPROVED' },
        ].map((file) => ({ ...file, key: `timeline-${getUniqueId()}.pdf`, fileSize: 10 })),
        { transaction }
      );
      await CommunicationLogFile.bulkCreate(
        [
          ...files.map((file, index) => ({
            fileId: file.id,
            communicationLogId: logs[index === 4 ? 12 : 0].id,
          })),
          { fileId: files[0].id, communicationLogId: logs[3].id },
        ],
        { transaction }
      );
    });
  });

  afterAll(async () => {
    await sequelize.transaction(async (transaction) => {
      const logIds = logs?.map(({ id }) => id) ?? [];
      await Promise.all([
        CommunicationLogFile.destroy({ where: { communicationLogId: logIds }, transaction }),
        CommunicationLogRecipient.destroy({ where: { communicationLogId: logIds }, transaction }),
      ]);
      await CommunicationLog.destroy({ where: { id: logIds }, transaction });
      // Metadata-only fixtures: no S3 objects were uploaded, so don't run individual file hooks.
      await File.destroy({ where: { id: files?.map(({ id }) => id) ?? [] }, transaction });
      await UserRole.destroy({ where: { userId: user?.id ?? [] }, transaction });
      await Promise.all([
        User.destroy({ where: { id: user?.id ?? [] }, transaction }),
        Role.destroy({ where: { id: role?.id ?? [] }, force: true, transaction }),
        Recipient.destroy({ where: { id: recipientIds }, transaction }),
        Region.destroy({ where: { id: regionIds }, transaction }),
      ]);
    });
  });

  it.each([
    ['desc', [1, 3, 2, 0]],
    ['asc', [0, 2, 1, 3]],
  ] as const)('sorts the registered source by communication date in %s order', async (direction, order) => {
    const result = await getRecipientTimeline({ ...params, direction });
    expect(result.count).toBe(4);
    expect(result.events.map(({ sourceId }) => sourceId)).toEqual(
      order.map((index) => logs[index].id)
    );
    const expected = [
      ['2025-12-31', 'Email communication'],
      ['2026-01-02', 'Phone communication'],
      ['2026-01-01', 'In person communication'],
      ['2026-01-02', 'Virtual communication'],
    ];
    result.events.forEach((event, index) => {
      const [date, eventType] = expected[order[index]];
      expect(event).toMatchObject({
        source: 'communicationLog',
        date,
        eventType,
        title: eventType,
      });
    });
  });

  it('populates the Figma fields, creator roles, readable notes, and approved attachments', async () => {
    const result = await getRecipientTimeline(params);
    expect(result.events.find(({ sourceId }) => sourceId === logs[0].id)).toEqual({
      source: 'communicationLog',
      sourceId: logs[0].id,
      date: '2025-12-31',
      eventType: 'Email communication',
      title: 'Email communication',
      subtitle: 'General check-in',
      durationHours: 0.25,
      byline: { label: 'By', values: [`Jane Hooper, ${role.name}`] },
      indicators: [],
      tags: [
        { label: 'Monitoring', flagged: true },
        { label: customStandard, flagged: false },
      ],
      details: [
        {
          label: 'Notes',
          items: [{ text: 'First & second.\n\nAnother paragraph.\n\n * Follow up\n * Review' }],
        },
        { label: 'Result', items: [{ text: 'Next Steps identified' }] },
        {
          label: 'Supporting attachments',
          items: [
            { text: 'Agenda.pdf', link: `https://attachments.example/${files[1].key}` },
            { text: 'Summary.pdf', link: `https://attachments.example/${files[0].key}` },
          ],
        },
      ],
      links: [
        {
          label: 'View communication log',
          to: `/recipient-tta-records/${params.recipientId}/region/${params.regionId}/communication/${logs[0].id}/view`,
        },
      ],
    });
    // The shared file is signed once, and unrelated/rejected/scanning files aren't signed.
    expect(s3.getSignedDownloadUrl).toHaveBeenCalledTimes(2);
    expect(result.events.find(({ sourceId }) => sourceId === logs[1].id)).toMatchObject({
      subtitle: null,
      durationHours: 1,
      indicators: [],
      tags: [],
      details: [],
    });
  });

  it('omits retired roles while retaining creators with no active roles', async () => {
    const retiredRole = await Role.create({
      id: getUniqueId(),
      name: `Retired-${getUniqueId()}`,
      fullName: 'Retired timeline test role',
      isSpecialist: true,
      deletedAt: new Date(),
    });
    try {
      await UserRole.create({ userId: user.id, roleId: retiredRole.id });
      const withActiveRole = await getRecipientTimeline(params);
      expect(withActiveRole.count).toBe(4);
      expect(withActiveRole.events.map(({ byline }) => byline)).toEqual(
        Array(4).fill({ label: 'By', values: [`Jane Hooper, ${role.name}`] })
      );

      await Role.update({ deletedAt: new Date() }, { where: { id: role.id } });
      const withoutActiveRoles = await getRecipientTimeline(params);
      expect(withoutActiveRoles.count).toBe(4);
      expect(withoutActiveRoles.events.map(({ byline }) => byline)).toEqual(
        Array(4).fill({ label: 'By', values: ['Jane Hooper'] })
      );
    } finally {
      await Role.update({ deletedAt: null }, { where: { id: role.id } });
      await UserRole.destroy({ where: { userId: user.id, roleId: retiredRole.id } });
      await retiredRole.destroy();
    }
  });

  it('normalizes padded region IDs without matching malformed values or other regions', async () => {
    const storedRegions = [
      params.regionId,
      String(params.regionId),
      `00${params.regionId}`,
      `${'0'.repeat(100)}${params.regionId}`,
      `00${regionIds[1]}`,
      `${params.regionId}invalid`,
      '9'.repeat(100),
      '000',
      '',
      null,
      undefined,
      { value: params.regionId },
      [params.regionId],
    ];
    const regionLogs = await CommunicationLog.bulkCreate(
      storedRegions.map((regionId) => ({
        userId: user.id,
        data: { regionId, method: 'Email', communicationDate: '03/01/2026' },
      }))
    );
    const logIds = regionLogs.map(({ id }) => id);
    try {
      await CommunicationLogRecipient.bulkCreate(
        logIds.map((communicationLogId) => ({
          communicationLogId,
          recipientId: params.recipientId,
        }))
      );
      const response = await request(app)
        .get(`/recipient/${params.recipientId}/region/00${params.regionId}/timeline`)
        .query({ limit: 4 });
      expect(response.status).toBe(200);
      // Four matching region variants plus the four baseline events; all new events sort first.
      expect(response.body.count).toBe(8);
      expect(response.body.events.map(({ sourceId }) => sourceId)).toEqual(logIds.slice(0, 4));
      response.body.events.forEach(({ links, sourceId }) => {
        expect(links[0].to).toBe(
          `/recipient-tta-records/${params.recipientId}/region/${params.regionId}/communication/${sourceId}/view`
        );
      });
    } finally {
      await CommunicationLogRecipient.destroy({ where: { communicationLogId: logIds } });
      await CommunicationLog.destroy({ where: { id: logIds } });
    }
  });

  it('keeps same-day events distinct across page boundaries', async () => {
    const pages = await Promise.all(
      [0, 1, 2, 3, 4].map((offset) => getRecipientTimeline({ ...params, limit: 1, offset }))
    );
    expect(pages.map(({ count }) => count)).toEqual([4, 4, 4, 4, 4]);
    expect(pages.flatMap(({ events }) => events.map(({ sourceId }) => sourceId))).toEqual(
      [1, 3, 2, 0].map((index) => logs[index].id)
    );
    expect(pages[4].events).toEqual([]);
  });

  it('identifies multi-recipient logs from associations and excludes them before paging/counting', async () => {
    const full = await getRecipientTimeline(params);
    expect(
      full.events
        .filter(({ indicators }) => indicators.includes('multiRecipient'))
        .map(({ sourceId }) => sourceId)
    ).toEqual([logs[3].id, logs[2].id]);
    const pages = await Promise.all(
      [0, 1, 2].map((offset) =>
        getRecipientTimeline({
          ...params,
          excludeMultiRecipientCommunications: true,
          limit: 1,
          offset,
        })
      )
    );
    expect(pages.map(({ count }) => count)).toEqual([2, 2, 2]);
    expect(pages.flatMap(({ events }) => events.map(({ sourceId }) => sourceId))).toEqual([
      logs[1].id,
      logs[0].id,
    ]);
    expect(pages[2].events).toEqual([]);
    const secondRecipient = await getRecipientTimeline({ ...params, recipientId: recipientIds[1] });
    expect(secondRecipient.events.map(({ sourceId }) => sourceId)).toEqual([
      logs[3].id,
      logs[2].id,
    ]);
    expect(
      secondRecipient.events.every(({ indicators }) => indicators.includes('multiRecipient'))
    ).toBe(true);
    expect(secondRecipient.events[0].links[0].to).toContain(
      `/recipient-tta-records/${recipientIds[1]}/`
    );
  });

  it('applies date, event-type, and standard filters including categories outside the communication allowlist', async () => {
    const query = (filters: RecipientTimelineRequestParams['filters']) =>
      getRecipientTimeline({ ...params, filters });
    const byDate = await query([
      { topic: 'date', condition: 'is within', query: '2026/01/02-2026/01/02' },
    ]);
    expect(byDate.events.map(({ sourceId }) => sourceId)).toEqual([logs[1].id, logs[3].id]);
    const byMethod = await query([
      {
        topic: 'eventType',
        condition: 'is',
        query: ['In person communication', 'Virtual communication'],
      },
    ]);
    expect(byMethod.events.map(({ sourceId }) => sourceId)).toEqual([logs[3].id, logs[2].id]);
    const withoutEmail = await query([
      { topic: 'eventType', condition: 'is not', query: ['Email communication'] },
    ]);
    expect(withoutEmail.count).toBe(3);
    const byStandard = await query([
      { topic: 'standard', condition: 'is', query: [customStandard] },
    ]);
    expect(byStandard.events.map(({ sourceId }) => sourceId)).toEqual([logs[0].id]);
    const withoutMonitoring = await query([
      { topic: 'standard', condition: 'is not', query: ['Monitoring'] },
    ]);
    expect(withoutMonitoring.events.map(({ sourceId }) => sourceId)).toEqual([
      logs[1].id,
      logs[3].id,
    ]);
    await expect(
      query([{ topic: 'standard', condition: 'is', query: ["Monitoring') OR TRUE --"] }])
    ).resolves.toEqual({ count: 0, events: [] });
  });

  it.each([
    { goals: undefined },
    { goals: null },
    { goals: {} },
    { goals: 'Monitoring' },
    { goals: [null, 'Monitoring', { label: null }, { label: 123 }] },
  ])('treats missing or malformed goals ($goals) as no labels in both filters and presentation', async ({
    goals,
  }) => {
    const log = await CommunicationLog.create({
      userId: user.id,
      data: {
        regionId: params.regionId,
        communicationDate: '03/01/2026',
        method: 'Email',
        goals,
      },
    });
    try {
      await CommunicationLogRecipient.create({
        communicationLogId: log.id,
        recipientId: params.recipientId,
      });
      const recent: RecipientTimelineRequestParams['filters'] = [
        { topic: 'date', condition: 'is on or after', query: '2026/03/01' },
      ];
      const included = await getRecipientTimeline({
        ...params,
        filters: [...recent, { topic: 'standard', condition: 'is', query: ['Monitoring'] }],
      });
      expect(included).toEqual({ count: 0, events: [] });
      const excluded = await getRecipientTimeline({
        ...params,
        filters: [...recent, { topic: 'standard', condition: 'is not', query: ['Monitoring'] }],
      });
      expect(excluded.count).toBe(1);
      expect(excluded.events[0]).toMatchObject({ sourceId: log.id, tags: [] });
    } finally {
      await CommunicationLogRecipient.destroy({ where: { communicationLogId: log.id } });
      await log.destroy();
    }
  });

  it.each([
    '13/45/2026', // Month and day both out of any calendar's range.
    '02/30/2026', // Shaped like a valid date, but February never has 30 days.
    '2026-01-01', // Wrong separator/order entirely.
  ])('excludes a calendar-invalid communicationDate (%s) instead of crashing the query', async (communicationDate) => {
    const log = await CommunicationLog.create({
      userId: user.id,
      data: {
        regionId: params.regionId,
        communicationDate,
        method: 'Email',
      },
    });
    try {
      await CommunicationLogRecipient.create({
        communicationLogId: log.id,
        recipientId: params.recipientId,
      });
      const result = await getRecipientTimeline(params);
      expect(result.count).toBe(4);
      expect(result.events.map(({ sourceId }) => sourceId)).not.toContain(log.id);
    } finally {
      await CommunicationLogRecipient.destroy({ where: { communicationLogId: log.id } });
      await log.destroy();
    }
  });

  it.each([
    'UTC',
    'America/Los_Angeles',
    'Asia/Tokyo',
  ])('keeps mixed-source ordering and checkbox pagination correct in %s', async (timeZone) => {
    await sequelize.transaction(async (transaction) => {
      await sequelize.query("SELECT set_config('TimeZone', :timeZone, true)", {
        replacements: { timeZone },
        transaction,
      });
      const sources = [
        COMMUNICATION_LOG_TIMELINE_SOURCE,
        {
          name: 'testGoal',
          supportedFilterTopics: [],
          populate: async () => new Map(),
          buildIndexQuery:
            () => `SELECT 1 AS "sourceId", TIMESTAMPTZ '2026-01-02T12:00:00Z' AS "date",
            'Goal added' AS "eventType", :recipientId AS "recipientId", :regionId AS "regionId"`,
        },
      ];
      const full = await queryTimelineEventIndex({ ...params, sources });
      expect(full.count).toBe(5);
      expect(full.events.map(({ sourceId }) => sourceId)).toEqual([
        1,
        logs[1].id,
        logs[3].id,
        logs[2].id,
        logs[0].id,
      ]);
      const filtered = await queryTimelineEventIndex({
        ...params,
        sources,
        excludeMultiRecipientCommunications: true,
      });
      expect(filtered.count).toBe(3);
      expect(filtered.events).toEqual([full.events[0], full.events[1], full.events[4]]);
      const page = await queryTimelineEventIndex({
        ...params,
        sources,
        limit: 2,
        offset: 1,
        excludeMultiRecipientCommunications: true,
      });
      expect(page).toEqual({ count: 3, events: filtered.events.slice(1) });
    });
  });

  it('retains attachment names when URL signing fails', async () => {
    jest
      .mocked(s3.getSignedDownloadUrl)
      .mockReturnValue({ url: null, error: new Error('Signing failed') });
    const result = await getRecipientTimeline(params);
    expect(result.events.find(({ sourceId }) => sourceId === logs[0].id)?.details.at(-1)).toEqual({
      label: 'Supporting attachments',
      items: [{ text: 'Agenda.pdf' }, { text: 'Summary.pdf' }],
    });
  });

  it.each([
    { edit: 'changes the method', method: 'Phone', addRecipient: false },
    { edit: 'clears the method', method: '', addRecipient: false },
    { edit: 'adds a recipient', method: 'Email', addRecipient: true },
  ])('keeps a consistent response when another connection $edit after indexing', async ({
    method,
    addRecipient,
  }) => {
    const originalData = {
      regionId: params.regionId,
      communicationDate: '03/01/2026',
      method: 'Email',
      purpose: 'Original purpose',
    };
    const log = await CommunicationLog.create({ userId: user.id, data: originalData });
    const timelinePath = `/recipient/${params.recipientId}/region/${params.regionId}/timeline`;
    const hookName = `timeline-concurrent-edit-${log.id}`;
    let editCommitted = false;
    let readerPid;
    let writerPid;
    try {
      await CommunicationLogRecipient.create({
        communicationLogId: log.id,
        recipientId: params.recipientId,
      });
      // Wait for the actual index query to finish, then commit on another connection before any
      // population query can run. No timers or mocked query results are involved.
      sequelize.addHook('afterQuery', hookName, async (options, query) => {
        if (editCommitted || !query.sql?.includes('WITH "timelineSourceEvents"')) return;
        const [reader] = await sequelize.query('SELECT pg_backend_pid() AS pid', {
          type: QueryTypes.SELECT,
          transaction: options.transaction,
        });
        readerPid = reader.pid;
        await sequelize.transaction({ transaction: null }, async (writer) => {
          const [connection] = await sequelize.query('SELECT pg_backend_pid() AS pid', {
            type: QueryTypes.SELECT,
            transaction: writer,
          });
          writerPid = connection.pid;
          await CommunicationLog.update(
            {
              data: {
                ...originalData,
                method,
                purpose: 'Edited purpose',
                communicationDate: '04/01/2026',
              },
            },
            { where: { id: log.id }, transaction: writer }
          );
          if (addRecipient) {
            await CommunicationLogRecipient.create(
              { communicationLogId: log.id, recipientId: recipientIds[1] },
              { transaction: writer }
            );
          }
        });
        editCommitted = true;
        // An independent read must already see the committed edit before population proceeds.
        const committedLog = await CommunicationLog.findByPk(log.id, { transaction: null });
        expect(committedLog.data.purpose).toBe('Edited purpose');
      });

      const response = await request(app)
        .get(timelinePath)
        .query({ excludeMultiRecipientCommunications: true, limit: 1 });
      expect(editCommitted).toBe(true);
      expect(readerPid).toEqual(expect.any(Number));
      expect(writerPid).toEqual(expect.any(Number));
      expect(writerPid).not.toBe(readerPid);
      expect(response.status).toBe(200);
      expect(response.body.count).toBe(3);
      expect(response.body.events).toEqual([
        expect.objectContaining({
          sourceId: log.id,
          date: '2026-03-01',
          eventType: 'Email communication',
          title: 'Email communication',
          subtitle: 'Original purpose',
          indicators: [],
        }),
      ]);

      sequelize.removeHook('afterQuery', hookName);
      const nextResponse = await request(app)
        .get(timelinePath)
        .query({ excludeMultiRecipientCommunications: true, limit: 1 });
      expect(nextResponse.status).toBe(200);
      if (method && !addRecipient) {
        expect(nextResponse.body.count).toBe(3);
        expect(nextResponse.body.events[0]).toMatchObject({
          sourceId: log.id,
          date: '2026-04-01',
          eventType: 'Phone communication',
          title: 'Phone communication',
          subtitle: 'Edited purpose',
        });
      } else {
        expect(nextResponse.body.count).toBe(2);
        expect(nextResponse.body.events[0].sourceId).toBe(logs[1].id);
      }
    } finally {
      sequelize.removeHook('afterQuery', hookName);
      // A regression can produce a real 500; remove only errors from this fixture's endpoint.
      await RequestErrors.destroy({ where: { uri: { [Op.like]: `${timelinePath}?%` } } });
      await CommunicationLogRecipient.destroy({ where: { communicationLogId: log.id } });
      await log.destroy();
    }
  });
});

describe('communication log presentation edge cases', () => {
  it('does not query for an empty page', async () => {
    const query = jest.spyOn(CommunicationLog, 'findAll');
    await expect(COMMUNICATION_LOG_TIMELINE_SOURCE.populate([], params)).resolves.toEqual(
      new Map()
    );
    expect(query).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    null,
    '',
    '   ',
    'invalid',
    -1,
    Infinity,
    false,
    {},
  ])('omits blank/invalid duration (%j) and optional fields without dropping an indexed event', async (duration) => {
    const query = jest.spyOn(CommunicationLog, 'findAll').mockResolvedValue([
      {
        id: 1,
        data: {
          method: 'Email',
          duration,
          purpose: ' ',
          result: null,
          notes: '<p>&nbsp;</p>',
          goals: null,
        },
        author: null,
      },
    ] as never);
    jest.spyOn(CommunicationLogRecipient, 'findAll').mockResolvedValue([
      { communicationLogId: 1, recipientId: 2 },
      { communicationLogId: 1, recipientId: 2 },
    ] as never);
    jest.spyOn(CommunicationLogFile, 'findAll').mockResolvedValue([]);
    const result = await COMMUNICATION_LOG_TIMELINE_SOURCE.populate([1, 1], {
      ...params,
      excludeMultiRecipientCommunications: true,
    });
    expect(result.get(1)).toMatchObject({
      title: 'Email communication',
      subtitle: null,
      durationHours: null,
      byline: null,
      indicators: [],
      tags: [],
      details: [],
    });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { [Op.in]: [1] } } })
    );
  });

  it('deduplicates creator roles, handles missing roles, and never reapplies eligibility during population', async () => {
    jest.spyOn(CommunicationLog, 'findAll').mockResolvedValue([
      {
        id: 1,
        data: { method: 'Phone', duration: 0 },
        author: { name: ' Jane ', roles: [{ name: 'GS' }, { name: 'ECS' }, { name: 'GS' }] },
      },
      { id: 2, data: { method: 'Email' }, author: { name: 'Alex' } },
    ] as never);
    jest.spyOn(CommunicationLogRecipient, 'findAll').mockResolvedValue([
      { communicationLogId: 1, recipientId: 2 },
      { communicationLogId: 1, recipientId: 3 },
    ] as never);
    jest.spyOn(CommunicationLogFile, 'findAll').mockResolvedValue([]);
    const result = await COMMUNICATION_LOG_TIMELINE_SOURCE.populate([1, 2], {
      ...params,
      excludeMultiRecipientCommunications: true,
      filters: [{ topic: 'standard', condition: 'is', query: ['Unmatched'] }],
    });
    expect(result.size).toBe(2);
    expect(result.get(1)).toMatchObject({
      byline: { label: 'By', values: ['Jane, ECS, GS'] },
      indicators: ['multiRecipient'],
      durationHours: 0,
    });
    expect(result.get(2)?.byline).toEqual({ label: 'By', values: ['Alex'] });
  });
});
