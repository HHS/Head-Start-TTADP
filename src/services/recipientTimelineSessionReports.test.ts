import type { RecipientTimelineRequestParams } from '@ttahub/common/src/recipientTimeline';
import { Op } from 'sequelize';
import db from '../models';
import { getUniqueId } from '../testUtils';
import { getRecipientTimeline, queryTimelineEventIndex } from './recipientTimeline';
import { SESSION_REPORT_TIMELINE_SOURCE } from './recipientTimelineSources';

const {
  EventReportPilot,
  GoalTemplate,
  Grant,
  Program,
  Recipient,
  Region,
  SessionReportPilot,
  SessionReportPilotGoalTemplate,
  SessionReportPilotTrainer,
  User,
  sequelize,
} = db;

const recipientIds = [getUniqueId(), getUniqueId()];
const regionIds = [getUniqueId(), getUniqueId()];
const grantIds = [getUniqueId(), getUniqueId(), getUniqueId(), getUniqueId()];
const standards = [`Timeline standard ${getUniqueId()}`, 'Monitoring'];
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

afterEach(() => jest.restoreAllMocks());
afterAll(async () => sequelize.close());

describe('session report timeline integration', () => {
  let event;
  let sessions;
  let trainers;
  let templates;
  let sessionIds;

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
      // grants[0], grants[1] belong to the viewed recipient/region; grants[2] belongs to a
      // different recipient; grants[3] belongs to the viewed recipient but a different region.
      await Grant.bulkCreate(
        [
          { id: grantIds[0], recipientId: recipientIds[0], regionId: regionIds[0] },
          { id: grantIds[1], recipientId: recipientIds[0], regionId: regionIds[0] },
          { id: grantIds[2], recipientId: recipientIds[1], regionId: regionIds[0] },
          { id: grantIds[3], recipientId: recipientIds[0], regionId: regionIds[1] },
        ].map((grant, index) => ({
          number: `Timeline-${grantIds[index]}`,
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          ...grant,
        })),
        { transaction }
      );
      await Program.bulkCreate(
        [
          { id: getUniqueId(), grantId: grantIds[0], programType: 'EHS' },
          { id: getUniqueId(), grantId: grantIds[1], programType: 'HS' },
        ],
        { transaction }
      );
      trainers = await User.bulkCreate(
        [
          { name: 'Angelica Stewart', hsesUsername: `timeline-${getUniqueId()}` },
          { name: 'Lily Morrison', hsesUsername: `timeline-${getUniqueId()}` },
        ],
        { transaction }
      );
      templates = await Promise.all(
        standards.map((standard) =>
          GoalTemplate.create(
            {
              templateName: `(${standard}) Timeline session goal ${getUniqueId()}`,
              creationMethod: 'Curated',
              standard,
            },
            { transaction }
          )
        )
      );

      event = await EventReportPilot.create(
        {
          ownerId: trainers[0].id,
          pocIds: [trainers[0].id],
          collaboratorIds: [],
          regionId: regionIds[0],
          eventId: `TR-TIMELINE-${getUniqueId()}`,
          data: {},
        },
        { individualHooks: false, transaction }
      );

      sessions = await SessionReportPilot.bulkCreate(
        [
          // 0: fully populated, multi-grant, one grant on a different recipient (ignored),
          // and a malformed extra recipient entry that must be treated as a harmless nonmatch.
          {
            startDate: '2026-05-21',
            data: {
              status: 'Complete',
              sessionName: 'Mental Health and Disabilities Manager',
              duration: '1',
              objective: '<p>Increase coaching skill.</p>',
              objectiveTopics: ['Teaching Practices', 'Mental Health'],
              objectiveSupportType: 'Introducing',
              recipients: [
                { value: grantIds[0] },
                { value: grantIds[1] },
                { value: grantIds[2] },
                { value: "1' OR '1'='1" },
                { value: -1 },
                // A decimal and an out-of-int4-range digit string must be harmless nonmatches,
                // not crash the whole UNION ALL timeline query (regression for TTAHUB-5661).
                { value: 4.5 },
                { value: '99999999999999999999' },
              ],
            },
          },
          // 1: missing optional fields, single grant, no linked trainers (falls back to
          // otherTrainers), no goal templates, no topics, no duration, no objective.
          {
            startDate: '2026-04-28',
            data: {
              status: 'Complete',
              sessionName: 'Minimal session',
              otherTrainers: 'Guest presenter',
              recipients: [{ value: String(grantIds[0]) }],
            },
          },
          // 2: not complete, must be excluded entirely.
          {
            startDate: '2026-04-01',
            data: {
              status: 'In progress',
              sessionName: 'Unfinished session',
              recipients: [{ value: grantIds[0] }],
            },
          },
          // 3: only touches a grant on a different region for this recipient; excluded.
          {
            startDate: '2026-03-01',
            data: {
              status: 'Complete',
              sessionName: 'Different region session',
              recipients: [{ value: grantIds[3] }],
            },
          },
          // 4: no linked trainers and no otherTrainers (byline stays null), and a negative
          // duration that must degrade to null rather than surfacing (regression for
          // TTAHUB-5661: assertPresentation rejects durationHours < 0 for the whole page).
          {
            startDate: '2026-02-01',
            data: {
              status: 'Complete',
              sessionName: 'No trainer session',
              duration: '-5',
              recipients: [{ value: grantIds[0] }],
            },
          },
        ].map((session) => ({ eventId: event.id, ...session })),
        { transaction, individualHooks: false }
      );
      sessionIds = sessions.map(({ id }) => id);

      await SessionReportPilotTrainer.bulkCreate(
        trainers.map((trainer) => ({ sessionReportPilotId: sessions[0].id, userId: trainer.id })),
        { transaction }
      );
      await SessionReportPilotGoalTemplate.bulkCreate(
        templates.map((template) => ({
          sessionReportPilotId: sessions[0].id,
          goalTemplateId: template.id,
        })),
        { transaction }
      );
    });
  });

  afterAll(async () => {
    await sequelize.transaction(async (transaction) => {
      await SessionReportPilotTrainer.destroy({
        where: { sessionReportPilotId: sessionIds },
        transaction,
      });
      await SessionReportPilotGoalTemplate.destroy({
        where: { sessionReportPilotId: sessionIds },
        transaction,
      });
      await SessionReportPilot.destroy({ where: { id: sessionIds }, transaction, force: true });
      await EventReportPilot.destroy({ where: { id: event.id }, transaction });
      await GoalTemplate.destroy({
        where: { id: templates.map(({ id }) => id) },
        force: true,
        transaction,
      });
      await Program.destroy({ where: { grantId: grantIds }, transaction });
      await User.destroy({ where: { id: trainers.map(({ id }) => id) }, transaction });
      await Grant.destroy({ where: { id: grantIds }, transaction });
      await Promise.all([
        Recipient.destroy({ where: { id: recipientIds }, transaction }),
        Region.destroy({ where: { id: regionIds }, transaction }),
      ]);
    });
  });

  it('includes only complete sessions with a grant matching the recipient and region', async () => {
    const result = await getRecipientTimeline(params);
    expect(result.count).toBe(3);
    expect(result.events.map(({ sourceId }) => sourceId)).toEqual([
      sessions[0].id,
      sessions[1].id,
      sessions[4].id,
    ]);
    expect(result.events.every(({ source }) => source === 'sessionReport')).toBe(true);
    expect(result.events.every(({ eventType }) => eventType === 'Training session')).toBe(true);
  });

  it('degrades a negative duration to null and leaves byline null without trainers or otherTrainers', async () => {
    const result = await getRecipientTimeline(params);
    expect(result.events[2]).toEqual({
      source: 'sessionReport',
      sourceId: sessions[4].id,
      date: '2026-02-01',
      eventType: 'Training session',
      durationHours: null,
      title: 'Training session',
      subtitle: 'No trainer session',
      byline: null,
      indicators: [],
      tags: [],
      details: [
        { label: 'Participating grants', items: [{ text: `Timeline-${grantIds[0]} - EHS` }] },
      ],
      links: [
        {
          label: 'View training report',
          to: `/training-report/${event.eventId}/session/${sessions[4].id}`,
        },
      ],
    });
  });

  it('narrows results by the standard filter and excludes sessions without a matching goal template', async () => {
    const matching = await getRecipientTimeline({
      ...params,
      filters: [{ topic: 'standard', condition: 'is', query: [standards[1]] }],
    });
    expect(matching.events.map(({ sourceId }) => sourceId)).toEqual([sessions[0].id]);

    const excluded = await getRecipientTimeline({
      ...params,
      filters: [{ topic: 'standard', condition: 'is not', query: standards }],
    });
    expect(excluded.events.map(({ sourceId }) => sourceId)).toEqual([
      sessions[1].id,
      sessions[4].id,
    ]);
  });

  it('populates the full FE detail layout for a multi-grant session', async () => {
    const result = await getRecipientTimeline(params);
    const trainerNames = trainers
      .map((trainer) => trainer.fullName)
      .sort((left, right) => left.localeCompare(right));

    expect(result.events[0]).toEqual({
      source: 'sessionReport',
      sourceId: sessions[0].id,
      date: '2026-05-21',
      eventType: 'Training session',
      durationHours: 1,
      title: 'Training session',
      subtitle: 'Mental Health and Disabilities Manager',
      byline: { label: 'Trainers', values: trainerNames },
      indicators: [],
      tags: expect.arrayContaining(
        standards.map((label) => ({ label, flagged: label === 'Monitoring' }))
      ),
      details: [
        { label: 'Session objective', items: [{ text: 'Increase coaching skill.' }] },
        { label: 'Topics', items: [{ text: 'Mental Health, Teaching Practices' }] },
        { label: 'Support type', items: [{ text: 'Introducing' }] },
        {
          label: 'Participating grants',
          items: expect.arrayContaining([
            { text: `Timeline-${grantIds[0]} - EHS` },
            { text: `Timeline-${grantIds[1]} - HS` },
          ]),
        },
      ],
      links: [
        {
          label: 'View training report',
          to: `/training-report/${event.eventId}/session/${sessions[0].id}`,
        },
      ],
    });
    expect(result.events[0].tags).toHaveLength(standards.length);
    expect(result.events[0].details[3].items).toHaveLength(2);
  });

  it('degrades missing optional fields without throwing', async () => {
    const result = await getRecipientTimeline(params);
    expect(result.events[1]).toEqual({
      source: 'sessionReport',
      sourceId: sessions[1].id,
      date: '2026-04-28',
      eventType: 'Training session',
      durationHours: null,
      title: 'Training session',
      subtitle: 'Minimal session',
      byline: { label: 'Trainers', values: ['Guest presenter'] },
      indicators: [],
      tags: [],
      details: [
        { label: 'Participating grants', items: [{ text: `Timeline-${grantIds[0]} - EHS` }] },
      ],
      links: [
        {
          label: 'View training report',
          to: `/training-report/${event.eventId}/session/${sessions[1].id}`,
        },
      ],
    });
  });

  it('interleaves session events with other source types without exposing the internal sort key', async () => {
    const result = await queryTimelineEventIndex({
      ...params,
      sources: [
        SESSION_REPORT_TIMELINE_SOURCE,
        {
          name: 'testActivityReport',
          supportedFilterTopics: [],
          buildIndexQuery: () => `SELECT 1 AS "sourceId", DATE '2026-05-01' AS "date",
            'TTA activity' AS "eventType", :recipientId AS "recipientId", :regionId AS "regionId"`,
          populate: async () => new Map(),
        },
      ],
    });
    expect(result.count).toBe(4);
    expect(
      result.events.map(({ source, eventType, date }) => ({ source, eventType, date }))
    ).toEqual([
      { source: 'sessionReport', eventType: 'Training session', date: '2026-05-21' },
      { source: 'testActivityReport', eventType: 'TTA activity', date: '2026-05-01' },
      { source: 'sessionReport', eventType: 'Training session', date: '2026-04-28' },
      { source: 'sessionReport', eventType: 'Training session', date: '2026-02-01' },
    ]);
  });
});

describe('session report detail loading', () => {
  const mockGrantFindAll = (grants: unknown[] = []) =>
    jest.spyOn(Grant, 'unscoped').mockReturnValue({
      findAll: jest.fn().mockResolvedValue(grants),
    } as never);

  it('does not query the database for an empty page', async () => {
    const query = jest.spyOn(SessionReportPilot, 'findAll');
    await expect(SESSION_REPORT_TIMELINE_SOURCE.populate([], {} as never)).resolves.toEqual(
      new Map()
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('accepts a numeric (non-string) duration', async () => {
    jest
      .spyOn(SessionReportPilot, 'findAll')
      .mockResolvedValue([{ id: 1, data: { duration: 2.5 } }] as never);
    mockGrantFindAll();

    const result = await SESSION_REPORT_TIMELINE_SOURCE.populate([1], params);
    expect(result.get(1)?.durationHours).toBe(2.5);
  });

  it('omits the Participating grants detail when no grant resolves for the recipient', async () => {
    jest
      .spyOn(SessionReportPilot, 'findAll')
      .mockResolvedValue([{ id: 1, data: { recipients: [{ value: 999 }] } }] as never);
    mockGrantFindAll([]);

    const result = await SESSION_REPORT_TIMELINE_SOURCE.populate([1], params);
    expect(result.get(1)?.details).toEqual([]);
  });

  it('excludes an out-of-int4-range grant id instead of passing it to Grant.findAll', async () => {
    jest.spyOn(SessionReportPilot, 'findAll').mockResolvedValue([
      {
        id: 1,
        data: { recipients: [{ value: 10 }, { value: '99999999999999999999' }] },
      },
    ] as never);
    // numberWithProgramTypes is a Sequelize virtual getter; the plain mock below stands in for it.
    const grantFindAll = jest
      .fn()
      .mockResolvedValue([{ id: 10, numberWithProgramTypes: 'Timeline-10' }]);
    jest.spyOn(Grant, 'unscoped').mockReturnValue({ findAll: grantFindAll } as never);

    const result = await SESSION_REPORT_TIMELINE_SOURCE.populate([1], params);
    expect(grantFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { [Op.in]: [10] } }) })
    );
    expect(result.get(1)?.details).toEqual([
      { label: 'Participating grants', items: [{ text: 'Timeline-10' }] },
    ]);
  });
});
