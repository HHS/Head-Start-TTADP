import type { RecipientTimelineRequestParams } from '@ttahub/common/src/recipientTimeline';
import db from '../models';
import { queryTimelineEventIndex } from './recipientTimeline';
import { ACTIVITY_REPORT_TIMELINE_SOURCE } from './recipientTimelineSources';

const {
  ActivityRecipient,
  ActivityReport,
  ActivityReportCollaborator,
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
  ActivityReportObjectiveTopic,
  Goal,
  Grant,
  Objective,
} = db;

const params: RecipientTimelineRequestParams = {
  recipientId: 100,
  regionId: 14,
  limit: 20,
  offset: 0,
  sortBy: 'date',
  direction: 'desc',
  filters: [],
  excludeMultiRecipientCommunications: false,
};

describe('ACTIVITY_REPORT_TIMELINE_SOURCE', () => {
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => db.sequelize.close());

  it('indexes only approved reports by start date and binds recipient-scoped standard filters', () => {
    const replacements: Record<string, unknown> = {};
    const query = ACTIVITY_REPORT_TIMELINE_SOURCE.buildIndexQuery(
      {
        ...params,
        filters: [{ topic: 'standard', condition: 'is not', query: ['Monitoring', "a'value"] }],
      },
      {
        add(name, value) {
          replacements[name] = value;
          return `:activityReport_${name}`;
        },
      }
    );

    expect(query).toContain('"report"."calculatedStatus" = \'approved\'');
    expect(query).toContain('"report"."startDate" AS "date"');
    expect(query).toContain('NOT EXISTS');
    expect(query).toContain('"filteredGrant"."recipientId" = :recipientId');
    expect(query).toContain('"filteredGrant"."regionId" = :regionId');
    expect(query).toContain('"filteredGoal"."deletedAt" IS NULL');
    expect(query).toContain('"filteredGoalTemplate"."deletedAt" IS NULL');
    expect(query).not.toContain("a'value");
    expect(replacements).toEqual({ standard_0: ['Monitoring', "a'value"] });
  });

  it('loads the event fields and scopes multi-recipient details to recipient goals', async () => {
    const reportFindAll = jest.fn().mockResolvedValue([
      {
        id: 50,
        duration: '4.5',
        deliveryMethod: 'in-person',
        legacyId: null,
        userId: 1,
        creatorRole: 'Grantee Specialist',
        author: { id: 1, name: 'Isabella Baker' },
      },
    ]);
    const grantFindAll = jest.fn().mockResolvedValue([
      {
        id: 10,
        number: '14CH010001',
        programs: [{ programType: 'HS' }, { programType: 'EHS' }],
      },
      { id: 11, number: '14CH010002', programs: [{ programType: 'HS' }] },
    ]);
    const activityRecipientFindAll = jest.fn().mockResolvedValue([
      { activityReportId: 50, grantId: 10 },
      { activityReportId: 50, grantId: 11 },
      // A grant for another recipient is not in grantFindAll and must not leak into the result.
      { activityReportId: 50, grantId: 999 },
    ]);

    jest.spyOn(ActivityReport, 'unscoped').mockReturnValue({ findAll: reportFindAll } as never);
    jest.spyOn(Grant, 'unscoped').mockReturnValue({ findAll: grantFindAll } as never);
    jest
      .spyOn(ActivityRecipient, 'unscoped')
      .mockReturnValue({ findAll: activityRecipientFindAll } as never);
    jest.spyOn(ActivityReportCollaborator, 'findAll').mockResolvedValue([
      {
        activityReportId: 50,
        userId: 2,
        user: { id: 2, name: 'Lindsay Perez' },
        roles: [{ name: 'PS' }, { name: 'GS' }],
      },
      {
        activityReportId: 50,
        userId: 1,
        user: { id: 1, name: 'Isabella Baker' },
        roles: [{ name: 'GS' }],
      },
    ] as never);
    jest.spyOn(ActivityReportGoal, 'findAll').mockResolvedValue([
      { activityReportId: 50, goalId: 1000 },
      { activityReportId: 50, goalId: 1001 },
      { activityReportId: 50, goalId: 1002 },
      { activityReportId: 50, goalId: 1999 },
    ] as never);
    jest.spyOn(ActivityReportObjective, 'findAll').mockResolvedValue([
      { id: 2000, activityReportId: 50, objectiveId: 3000 },
      { id: 2001, activityReportId: 50, objectiveId: 3001 },
      { id: 2003, activityReportId: 50, objectiveId: 3002 },
      // This objective belongs to the other recipient's goal and must not contribute topics.
      { id: 2002, activityReportId: 50, objectiveId: 3999 },
    ] as never);
    const goalFindAll = jest.spyOn(Goal, 'findAll').mockResolvedValue([
      { id: 1000, grantId: 10, goalTemplate: { standard: 'Monitoring' } },
      { id: 1001, grantId: 11, goalTemplate: { standard: 'New Leaders' } },
      // A missing/deleted template removes the tag, not recipient ownership of its topics.
      { id: 1002, grantId: 10, goalTemplate: null },
    ] as never);
    const objectiveFindAll = jest.spyOn(Objective, 'findAll').mockResolvedValue([
      { id: 3000, goalId: 1000 },
      { id: 3001, goalId: 1001 },
      { id: 3002, goalId: 1002 },
    ] as never);
    const topicFindAll = jest.spyOn(ActivityReportObjectiveTopic, 'findAll').mockResolvedValue([
      { activityReportObjectiveId: 2000, topic: { name: 'Program Planning and Services' } },
      { activityReportObjectiveId: 2001, topic: { name: 'Fiscal / Budget' } },
      { activityReportObjectiveId: 2001, topic: { name: 'Fiscal / Budget' } },
      { activityReportObjectiveId: 2003, topic: { name: 'Human Resources' } },
    ] as never);
    jest.spyOn(ActivityReportObjectiveCitation, 'findAll').mockResolvedValue([
      {
        activityReportObjectiveId: 2000,
        grantId: 10,
        acro: 'ANC',
        citation: '1302.90(b)(1-2)',
        findingSource: 'Health',
      },
    ] as never);

    const result = await ACTIVITY_REPORT_TIMELINE_SOURCE.loadDetails([50], params);

    expect(result.get(50)).toEqual({
      durationHours: 4.5,
      title: 'TTA activity',
      subtitle: null,
      byline: {
        label: 'Specialists',
        values: ['Isabella Baker, GS', 'Lindsay Perez, GS, PS'],
      },
      indicators: [],
      tags: [
        { label: 'Monitoring', flagged: true },
        { label: 'New Leaders', flagged: false },
      ],
      details: [
        {
          label: 'Topics',
          items: [{ text: 'Fiscal / Budget, Human Resources, Program Planning and Services' }],
        },
        { label: 'Delivery method', items: [{ text: 'In person' }] },
        {
          label: 'Citations addressed',
          items: [{ text: 'ANC - 1302.90(b)(1-2) - Health' }],
        },
        {
          label: 'Grant numbers',
          items: [{ text: '14CH010001 - EHS, HS' }, { text: '14CH010002 - HS' }],
        },
      ],
      links: [{ label: 'View activity report', to: '/activity-reports/view/50' }],
    });
    expect(reportFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { [db.Sequelize.Op.in]: [50] } } })
    );
    expect(activityRecipientFindAll).toHaveBeenCalledWith({
      attributes: ['activityReportId', 'grantId'],
      where: {
        activityReportId: { [db.Sequelize.Op.in]: [50] },
        grantId: { [db.Sequelize.Op.ne]: null },
      },
    });
    expect(grantFindAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { [db.Sequelize.Op.in]: [10, 11, 999] },
          recipientId: 100,
          regionId: 14,
        },
      })
    );
    expect(goalFindAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ grantId: { [db.Sequelize.Op.in]: [10, 11] } }),
        include: [expect.objectContaining({ as: 'goalTemplate', required: false })],
      })
    );
    expect(objectiveFindAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ goalId: { [db.Sequelize.Op.in]: [1000, 1001, 1002] } }),
      })
    );
    expect(topicFindAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { activityReportObjectiveId: { [db.Sequelize.Op.in]: [2000, 2001, 2003] } },
      })
    );
  });

  it('uses legacy links and hides citations when Monitoring is not a recipient goal tag', async () => {
    jest.spyOn(ActivityReport, 'unscoped').mockReturnValue({
      findAll: jest.fn().mockResolvedValue([
        {
          id: 51,
          duration: null,
          deliveryMethod: 'virtual',
          legacyId: 'R14-AR-51',
          userId: null,
          creatorRole: null,
          author: null,
        },
      ]),
    } as never);
    jest.spyOn(Grant, 'unscoped').mockReturnValue({
      findAll: jest.fn().mockResolvedValue([{ id: 10, number: '14CH010001', programs: [] }]),
    } as never);
    jest.spyOn(ActivityRecipient, 'unscoped').mockReturnValue({
      findAll: jest.fn().mockResolvedValue([{ activityReportId: 51, grantId: 10 }]),
    } as never);
    jest.spyOn(ActivityReportCollaborator, 'findAll').mockResolvedValue([]);
    jest
      .spyOn(ActivityReportGoal, 'findAll')
      .mockResolvedValue([{ activityReportId: 51, goalId: 1000 }] as never);
    jest
      .spyOn(ActivityReportObjective, 'findAll')
      .mockResolvedValue([{ id: 2000, activityReportId: 51, objectiveId: 3000 }] as never);
    jest
      .spyOn(Goal, 'findAll')
      .mockResolvedValue([
        { id: 1000, grantId: 10, goalTemplate: { standard: 'New Leaders' } },
      ] as never);
    jest.spyOn(Objective, 'findAll').mockResolvedValue([{ id: 3000, goalId: 1000 }] as never);
    jest.spyOn(ActivityReportObjectiveTopic, 'findAll').mockResolvedValue([]);
    jest.spyOn(ActivityReportObjectiveCitation, 'findAll').mockResolvedValue([
      {
        activityReportObjectiveId: 2000,
        grantId: 10,
        acro: 'ANC',
        citation: '1302.90(b)(1-2)',
        findingSource: 'Health',
      },
    ] as never);

    const result = await ACTIVITY_REPORT_TIMELINE_SOURCE.loadDetails([51], params);
    const event = result.get(51);

    expect(event?.byline).toBeNull();
    expect(event?.details.map(({ label }) => label)).not.toContain('Citations addressed');
    expect(event?.links).toEqual([
      { label: 'View activity report', to: '/activity-reports/legacy/R14-AR-51' },
    ]);
  });

  it('executes its parameterized index query through the shared assembler', async () => {
    const result = await queryTimelineEventIndex({
      ...params,
      recipientId: 2_147_483_647,
      filters: [{ topic: 'standard', condition: 'is', query: ["Monitoring' OR TRUE --"] }],
      sources: [ACTIVITY_REPORT_TIMELINE_SOURCE],
    });

    expect(result).toEqual({ count: 0, events: [] });
  });
});
