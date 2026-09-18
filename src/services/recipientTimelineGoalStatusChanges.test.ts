import type { RecipientTimelineRequestParams } from '@ttahub/common/src/recipientTimeline';
import { Op } from 'sequelize';
import changeGoalStatus from '../goalServices/changeGoalStatus';
import db from '../models';
import { getUniqueId } from '../testUtils';
import { getRecipientTimeline, queryTimelineEventIndex } from './recipientTimeline';
import { GOAL_STATUS_CHANGE_TIMELINE_SOURCE } from './recipientTimelineSources';
import { newStandardGoal } from './standardGoals';

const { Goal, GoalStatusChange, GoalTemplate, Grant, Recipient, Region, User, sequelize } = db;
const recipientIds = [getUniqueId(), getUniqueId()];
const regionIds = [getUniqueId(), getUniqueId()];
const grantIds = [getUniqueId(), getUniqueId(), getUniqueId()];
const standards = [`Timeline standard ${getUniqueId()}`, `Deleted standard ${getUniqueId()}`];
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

describe('goal status change timeline integration', () => {
  let goals;
  let changes;
  let templates;
  let user;

  beforeAll(async () => {
    await sequelize.transaction(async (transaction) => {
      await Promise.all([
        Region.bulkCreate(
          regionIds.map((id) => ({ id, name: `Timeline region ${id}` })),
          {
            transaction,
          }
        ),
        Recipient.bulkCreate(
          recipientIds.map((id) => ({ id, name: `Timeline recipient ${id}` })),
          {
            transaction,
          }
        ),
      ]);
      await Grant.bulkCreate(
        grantIds.map((id, index) => ({
          id,
          number: `Timeline-${id}`,
          recipientId: recipientIds[index === 1 ? 1 : 0],
          regionId: regionIds[index === 2 ? 1 : 0],
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        })),
        { transaction }
      );
      templates = await Promise.all(
        standards.map((standard) =>
          GoalTemplate.create(
            { templateName: `(${standard}) Timeline goal`, creationMethod: 'Curated' },
            { transaction }
          )
        )
      );
      await templates[1].destroy({ transaction });
      user = await User.create(
        { name: 'Current author name', hsesUsername: `timeline-${getUniqueId()}` },
        { transaction }
      );
      goals = await Goal.bulkCreate(
        [
          { name: 'Improve program services', goalTemplateId: templates[0].id },
          { name: null },
          { grantId: grantIds[1] },
          { grantId: grantIds[2] },
          { deletedAt: new Date('2026-08-23T00:00:00Z') },
          { status: 'Draft' },
          { goalTemplateId: templates[1].id },
        ].map((goal) => ({ status: 'In Progress', grantId: grantIds[0], ...goal })),
        { transaction }
      );
      const mergedGoal = await Goal.create(
        { status: 'Closed', grantId: grantIds[0], mapsToParentGoalId: goals[0].id },
        { hooks: false, transaction }
      );
      goals.push(mergedGoal);

      // Insert out of chronological order so sorting by row ID cannot accidentally pass.
      changes = await GoalStatusChange.bulkCreate(
        [
          {
            oldStatus: 'In Progress',
            newStatus: 'Closed',
            performedAt: '2026-08-22T18:00:00Z',
            userId: user.id,
            userName: ' Historical author ',
            userRoles: ['PS', 'GS', 'GS'],
            reason: ' All objectives achieved ',
            context: ' Recipient completed the work. ',
          },
          { oldStatus: null, newStatus: 'Not Started', performedAt: '2026-08-21T09:00:00Z' },
          { oldStatus: 'In Progress', newStatus: 'Suspended', performedAt: '2026-08-22T10:00:00Z' },
          { oldStatus: 'Suspended', newStatus: 'In Progress', performedAt: '2026-08-22T12:00:00Z' },
          { oldStatus: 'Closed', newStatus: 'Not Started', performedAt: '2026-08-22T18:00:00Z' },
          {
            goalId: goals[1].id,
            oldStatus: 'In Progress',
            newStatus: 'Closed',
            performedAt: null,
            createdAt: '2026-08-22T23:59:59Z',
          },
          {
            goalId: goals[6].id,
            oldStatus: 'Draft',
            newStatus: 'Not Started',
            performedAt: '2026-08-20T09:00:00Z',
            userId: user.id,
          },
          // These rows have no corresponding public timeline event type.
          { oldStatus: null, newStatus: 'Draft' },
          { oldStatus: 'Not Started', newStatus: 'In Progress' },
          { oldStatus: 'Closed', newStatus: 'Closed' },
          { oldStatus: 'In Progress', newStatus: null },
          { oldStatus: 'In Progress', newStatus: 'Unknown' },
          ...[2, 3, 4, 5, 7].map((index) => ({
            goalId: goals[index].id,
            oldStatus: 'In Progress',
            newStatus: 'Closed',
          })),
        ].map((change) => ({
          goalId: goals[0].id,
          performedAt: '2026-08-22T19:00:00Z',
          createdAt: '2026-08-25T00:00:00Z',
          ...change,
        })),
        { transaction }
      );
    });
  });

  afterAll(async () => {
    await sequelize.transaction(async (transaction) => {
      const goalIds = goals?.map(({ id }) => id) ?? [];
      await GoalStatusChange.destroy({ where: { goalId: goalIds }, transaction });
      await Goal.unscoped().destroy({ where: { id: goalIds }, force: true, transaction });
      await Promise.all([
        GoalTemplate.destroy({
          where: { id: templates?.map(({ id }) => id) ?? [] },
          force: true,
          transaction,
        }),
        Grant.destroy({ where: { id: grantIds }, transaction }),
        User.destroy({ where: { id: user?.id ?? [] }, transaction }),
      ]);
      await Promise.all([
        Recipient.destroy({ where: { id: recipientIds }, transaction }),
        Region.destroy({ where: { id: regionIds }, transaction }),
      ]);
    });
  });

  it.each([
    ['desc', [5, 0, 4, 3, 2, 1, 6]],
    ['asc', [6, 1, 2, 3, 0, 4, 5]],
  ] as const)('orders the registered source by event time in %s order', async (direction, order) => {
    const result = await getRecipientTimeline({ ...params, direction });

    expect(result.count).toBe(7);
    expect(result.events.map(({ sourceId }) => sourceId)).toEqual(
      order.map((index) => changes[index].id)
    );
    expect(result.events.every(({ source }) => source === 'goalStatusChange')).toBe(true);
    expect(result.events.find(({ sourceId }) => sourceId === changes[0].id)).toEqual({
      source: 'goalStatusChange',
      sourceId: changes[0].id,
      date: '2026-08-22',
      eventType: 'Goal closed',
      durationHours: null,
      title: 'Goal closed',
      subtitle: 'Improve program services',
      byline: { label: 'Author', values: ['Historical author, GS, PS'] },
      indicators: [],
      tags: [{ label: standards[0], flagged: false }],
      details: [
        { label: 'Previous status', items: [{ text: 'In Progress' }] },
        { label: 'New status', items: [{ text: 'Closed' }] },
        { label: 'Reason', items: [{ text: 'All objectives achieved' }] },
        { label: 'Context', items: [{ text: 'Recipient completed the work.' }] },
        { label: 'Grant number', items: [{ text: `Timeline-${grantIds[0]}` }] },
      ],
      links: [
        {
          label: 'View goal',
          to: `/recipient-tta-records/${params.recipientId}/region/${params.regionId}/goals/standard?goalId=${goals[0].id}`,
        },
      ],
    });
  });

  it('keeps distinct same-day changes across page boundaries, including exact timestamp ties', async () => {
    const pages = await Promise.all(
      [0, 2, 4, 6].map((offset) => getRecipientTimeline({ ...params, limit: 2, offset }))
    );
    expect(pages.map(({ count }) => count)).toEqual([7, 7, 7, 7]);
    expect(pages.flatMap(({ events }) => events.map(({ sourceId }) => sourceId))).toEqual(
      [5, 0, 4, 3, 2, 1, 6].map((index) => changes[index].id)
    );
    await expect(getRecipientTimeline({ ...params, offset: 7 })).resolves.toEqual({
      count: 7,
      events: [],
    });
  });

  it('includes the entire filtered day, including a missing performedAt timestamp', async () => {
    const result = await getRecipientTimeline({
      ...params,
      filters: [{ topic: 'date', condition: 'is within', query: '2026/08/22-2026/08/22' }],
    });
    expect(result.events.map(({ sourceId }) => sourceId)).toEqual(
      [5, 0, 4, 3, 2].map((index) => changes[index].id)
    );
    const missingOptionalFields = result.events[0];
    expect(missingOptionalFields).toMatchObject({
      date: '2026-08-22',
      title: 'Goal closed',
      subtitle: null,
      byline: null,
      tags: [],
      details: [
        { label: 'Previous status', items: [{ text: 'In Progress' }] },
        { label: 'New status', items: [{ text: 'Closed' }] },
        { label: 'Grant number', items: [{ text: `Timeline-${grantIds[0]}` }] },
      ],
    });
  });

  it('applies standard and event-type filters and keeps events with missing/deleted templates', async () => {
    const included = await getRecipientTimeline({
      ...params,
      filters: [
        { topic: 'standard', condition: 'is', query: [standards[0]] },
        { topic: 'eventType', condition: 'is', query: ['Goal suspended', 'Goal reopened'] },
      ],
    });
    expect(included.events.map(({ sourceId }) => sourceId)).toEqual(
      [4, 3, 2].map((index) => changes[index].id)
    );
    const excluded = await getRecipientTimeline({
      ...params,
      filters: [{ topic: 'standard', condition: 'is not', query: standards }],
    });
    expect(excluded.events.map(({ sourceId }) => sourceId)).toEqual([changes[5].id, changes[6].id]);
    expect(excluded.events[1]).toMatchObject({
      title: 'Goal added',
      byline: { label: 'Author', values: ['Current author name'] },
      tags: [],
    });
    const unsafeStandard = await getRecipientTimeline({
      ...params,
      filters: [{ topic: 'standard', condition: 'is', query: ["Monitoring') OR TRUE --"] }],
    });
    expect(unsafeStandard).toEqual({ count: 0, events: [] });
  });

  it('interleaves goal timestamps with date-only sources without exposing the internal sort key', async () => {
    const result = await queryTimelineEventIndex({
      ...params,
      sources: [
        GOAL_STATUS_CHANGE_TIMELINE_SOURCE,
        {
          name: 'testActivityReport',
          supportedFilterTopics: [],
          buildIndexQuery: () => `SELECT 1 AS "sourceId", DATE '2026-08-22' AS "date",
            'TTA activity' AS "eventType", :recipientId AS "recipientId", :regionId AS "regionId"`,
          populate: async () => new Map(),
        },
      ],
    });
    expect(result.count).toBe(8);
    expect(result.events[5]).toEqual({
      source: 'testActivityReport',
      sourceId: 1,
      date: '2026-08-22',
      eventType: 'TTA activity',
    });
  });

  it('classifies the actual standard-goal reopen flow in both event filters and titles', async () => {
    // Keep this lifecycle separate from the recipient used by the pagination fixtures.
    const reopenGrantId = grantIds[1];
    const standard = `Reopen timeline ${getUniqueId()}`;
    const template = await GoalTemplate.create({
      templateName: `(${standard}) Reopen this goal`,
      creationMethod: 'Curated',
    });
    templates.push(template);

    // None of these closed goals is a previous use of this standard on this grant.
    const unrelatedGoals = await Goal.bulkCreate(
      [
        { grantId: grantIds[0] },
        { goalTemplateId: templates[0].id },
        { deletedAt: new Date() },
        { mapsToParentGoalId: goals[0].id },
        { prestandard: true },
      ].map((goal) => ({
        grantId: reopenGrantId,
        goalTemplateId: template.id,
        status: 'Closed',
        ...goal,
      }))
    );
    goals.push(...unrelatedGoals);

    const initialChangeIds = [];
    for (let cycle = 0; cycle < 3; cycle += 1) {
      const goal = await newStandardGoal(reopenGrantId, template.id);
      goals.push(goal);
      const initialChange = await GoalStatusChange.findOne({
        where: { goalId: goal.id, oldStatus: null },
      });
      expect(initialChange).not.toBeNull();
      initialChangeIds.push(initialChange.id);
      if (cycle < 2) {
        await changeGoalStatus({
          goalId: goal.id,
          userId: user.id,
          newStatus: 'Closed',
          reason: 'All objectives achieved',
          context: 'Closed before reopening',
        });
      }
    }

    const filteredTimeline = (
      eventType: 'Goal added' | 'Goal reopened',
      condition: 'is' | 'is not' = 'is'
    ) =>
      getRecipientTimeline({
        ...params,
        recipientId: recipientIds[1],
        direction: 'asc',
        filters: [
          { topic: 'standard', condition: 'is', query: [standard] },
          { topic: 'eventType', condition, query: [eventType] },
        ],
      });
    const added = await filteredTimeline('Goal added');
    expect(added.count).toBe(1);
    expect(added.events).toEqual([
      expect.objectContaining({ sourceId: initialChangeIds[0], title: 'Goal added' }),
    ]);
    const reopened = await filteredTimeline('Goal reopened');
    expect(reopened.count).toBe(2);
    expect(reopened.events).toEqual(
      initialChangeIds
        .slice(1)
        .map((sourceId) =>
          expect.objectContaining({ sourceId, eventType: 'Goal reopened', title: 'Goal reopened' })
        )
    );
    const withoutReopened = await filteredTimeline('Goal reopened', 'is not');
    expect(withoutReopened.events.map(({ eventType }) => eventType)).toEqual([
      'Goal added',
      'Goal closed',
      'Goal closed',
    ]);
  });
});

describe('goal status change detail loading', () => {
  it('does not query the database for an empty page', async () => {
    const query = jest.spyOn(GoalStatusChange, 'unscoped');
    await expect(GOAL_STATUS_CHANGE_TIMELINE_SOURCE.populate([], params)).resolves.toEqual(
      new Map()
    );
    expect(query).not.toHaveBeenCalled();
  });

  it.each([
    null,
    undefined,
    '   ',
  ])('omits blank optional fields (%s) and batches exact page IDs', async (missing) => {
    const findAll = jest.fn().mockResolvedValue([
      {
        id: 1,
        get: () => false,
        oldStatus: null,
        newStatus: 'Not Started',
        userName: missing,
        userRoles: [null, '', '  '],
        reason: missing,
        context: missing,
        goal: { id: 20, name: missing, goalTemplate: { standard: missing } },
      },
    ]);
    jest.spyOn(GoalStatusChange, 'unscoped').mockReturnValue({ findAll } as never);
    const result = await GOAL_STATUS_CHANGE_TIMELINE_SOURCE.populate([1, 1], params);
    expect(result.get(1)).toMatchObject({
      title: 'Goal added',
      subtitle: null,
      byline: null,
      tags: [],
      details: [{ label: 'New status', items: [{ text: 'Not Started' }] }],
    });
    expect(findAll).toHaveBeenCalledTimes(1);
    expect(findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { [Op.in]: [1] } },
        include: expect.arrayContaining([
          expect.objectContaining({ as: 'goal', required: false, paranoid: false }),
        ]),
      })
    );
  });
});
