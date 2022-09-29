import db, {
  ActivityReport,
  ActivityRecipient,
  ActivityReportGoal,
  ActivityReportObjective,
  Approval,
  Goal,
  Objective,
  User,
  Recipient,
  OtherEntity,
  Grant,
} from '..';
import { REPORT_STATUSES, ENTITY_TYPES } from '../../constants';
import { auditLogger } from '../../logger';
import {
  copyStatus,
} from '../hooks/approval';
import { createOrUpdate } from '../../services/activityReports';

const mockUser = {
  name: 'Joe Green',
  role: ['TTAC'],
  phoneNumber: '555-555-554',
  hsesUserId: '65536',
  hsesUsername: 'test50@test50.com',
  hsesAuthorities: ['ROLE_FEDERAL'],
  email: 'test50@test50.com',
  homeRegionId: 1,
  lastLogin: new Date('2021-02-09T15:13:00.000Z'),
  permissions: [
    {
      regionId: 1,
      scopeId: 1,
    },
    {
      regionId: 2,
      scopeId: 1,
    },
  ],
  flags: [],
};

const mockRecipient = {
  id: 65535,
  uei: 'NNA5N2KHMGM2',
  name: 'Tooth Brushing Academy',
  recipientType: 'Community Action Agency (CAA)',
};

const mockOtherEntity = {
  name: 'Regional TTA/Other Specialists',
};

const mockGrant = {
  id: 65535,
  number: '99CH9999',
  regionId: 2,
  status: 'Active',
  startDate: new Date('2021-02-09T15:13:00.000Z'),
  endDate: new Date('2021-02-09T15:13:00.000Z'),
  cdi: false,
  grantSpecialistName: null,
  grantSpecialistEmail: null,
  stateCode: 'NY',
  annualFundingMonth: 'October',
};

const sampleReport = {
  approval: {
    submissionStatus: REPORT_STATUSES.DRAFT,
    calculatedStatus: REPORT_STATUSES.DRAFT,
  },
  oldApprovingManagerId: 1,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  activityRecipientType: 'test',
  creatorRole: 'COR',
  topics: ['topic'],
  participants: ['test'],
  duration: 0,
  endDate: '2020-01-01T12:00:00Z',
  startDate: '2020-01-01T12:00:00Z',
  requester: 'requester',
  programTypes: ['type'],
  reason: ['reason'],
  ttaType: ['type'],
  regionId: 2,
  targetPopulations: ['target pop'],
  author: {
    fullName: 'Kiwi, GS',
    name: 'Kiwi',
    role: 'Grants Specialist',
    homeRegionId: 1,
  },
};

const mockGoals = [
  { name: 'goal 1' },
  { name: 'goal 2' },
];

const mockObjectives = [
  { title: 'objective 1' },
  { title: 'objective 2' },
];

describe('Activity Reports model', () => {
  let user;
  let recipient;
  let otherEntity;
  let grant;
  let report;
  const goals = [];
  const objectives = [];
  beforeAll(async () => {
    try {
      user = await User.create({ ...mockUser });
      recipient = await Recipient.create({ ...mockRecipient });
      otherEntity = await OtherEntity.create({ ...mockOtherEntity });
      await Grant.create({
        ...mockGrant,
        recipientId: recipient.id,
        programSpecialistName: user.name,
        programSpecialistEmail: user.email,
      });
      grant = await Grant.findOne({ where: { id: mockGrant.id } });
      try {
        report = await createOrUpdate({
          ...sampleReport,
          activityRecipients: [{ grantId: grant.id }, { otherEntityId: otherEntity.id }],
        });
      } catch (err) {
        auditLogger.error(JSON.stringify({ name: 'Activity Reports model', err }));
      }
      await ActivityRecipient.create({ activityReportId: report.id }, { validation: false });
      goals[0] = await Goal.create({
        ...mockGoals[0],
        grantId: grant.id,
      });
      goals[1] = await Goal.create({
        ...mockGoals[1],
        grantId: grant.id,
      });
      await Promise.all(goals);
      await Promise.all(goals.map(async (goal) => ActivityReportGoal.create({
        activityReportId: report.id,
        goalId: goal.id,
        status: goal.status,
      })));
      objectives[0] = await Objective.create({
        ...mockObjectives[0],
        goalId: goals[0].id,
      });
      objectives[1] = await Objective.create({
        ...mockObjectives[1],
        goalId: goals[1].id,
      });
      await Promise.all(objectives);
      await Promise.all(objectives.map(async (objective) => ActivityReportObjective.create({
        activityReportId: report.id,
        objectiveId: objective.id,
        status: objective.status,
      })));
    } catch (e) {
      auditLogger.error(JSON.stringify(e));
      throw e;
    }
  });
  afterAll(async () => {
    await ActivityRecipient.destroy({
      where: { activityReportId: report.id },
      individualHooks: true,
    });
    await ActivityReportObjective.destroy({
      where: { activityReportId: report.id },
      individualHooks: true,
    });
    await ActivityReportGoal.destroy({
      where: { activityReportId: report.id },
      individualHooks: true,
    });
    await ActivityReport.destroy({
      where: { id: report.id },
      individualHooks: true,
    });
    await Objective.destroy({
      where: { id: objectives.map((o) => o.id) },
      individualHooks: true,
    });
    await Goal.destroy({
      where: { grantId: grant.id },
      individualHooks: true,
    });
    await Grant.destroy({
      where: { id: grant.id },
      individualHooks: true,
    });
    await OtherEntity.destroy({
      where: { id: otherEntity.id },
      individualHooks: true,
    });
    await Recipient.destroy({
      where: { id: recipient.id },
      individualHooks: true,
    });
    await User.destroy({
      where: { id: user.id },
      individualHooks: true,
    });
    await db.sequelize.close();
  });

  it('copyStatus', async () => {
    const instance = { approval: { submissionStatus: REPORT_STATUSES.DRAFT } };
    instance.set = (name, value) => { instance[name] = value; };
    copyStatus(instance.approval);
    expect(instance.approval.calculatedStatus).toEqual(REPORT_STATUSES.DRAFT);
    instance.approval.submissionStatus = REPORT_STATUSES.DELETED;
    copyStatus(instance.approval);
    expect(instance.approval.calculatedStatus).toEqual(REPORT_STATUSES.DELETED);
    instance.approval.submissionStatus = REPORT_STATUSES.SUBMITTED;
    copyStatus(instance.approval);
    expect(instance.approval.calculatedStatus).not.toEqual(REPORT_STATUSES.SUBMITTED);
    instance.approval.submissionStatus = REPORT_STATUSES.APPROVED;
    copyStatus(instance.approval);
    expect(instance.approval.calculatedStatus).not.toEqual(REPORT_STATUSES.APPROVED);
    instance.approval.submissionStatus = REPORT_STATUSES.NEEDS_ACTION;
    copyStatus(instance.approval);
    expect(instance.approval.calculatedStatus).not.toEqual(REPORT_STATUSES.NEEDS_ACTION);
  });
  it('propagateApprovedStatus', async () => {
    const preReport = await ActivityReport.findOne(
      { where: { id: report.id }, individualHooks: true },
    );

    const goalsPre = await Goal.findAll({
      attributes: [
        'id',
        'onApprovedAR',
      ],
      where: { id: goals.map((g) => g.id) },
    });
    const objectivesPre = await Objective.findAll({
      attributes: [
        'id',
        'onApprovedAR',
      ],
      where: { id: objectives.map((o) => o.id) },
    });

    await Approval.update(
      { calculatedStatus: REPORT_STATUSES.APPROVED, submissionStatus: REPORT_STATUSES.SUBMITTED },
      {
        where: { entityType: ENTITY_TYPES.REPORT, entityId: preReport.id, tier: 0 },
        individualHooks: true,
      },
    );
    await ActivityReport.findOne(
      { where: { id: report.id }, individualHooks: true },
    );

    const goalsPost = await Goal.findAll({
      attributes: [
        'id',
        'onApprovedAR',
      ],
      where: { id: goals.map((g) => g.id) },
    });
    const objectivesPost = await Objective.findAll({
      attributes: [
        'id',
        'onApprovedAR',
      ],
      where: { id: objectives.map((o) => o.id) },
    });

    expect(goalsPost[0].onApprovedAR).not.toEqual(goalsPre[0].onApprovedAR);
    expect(objectivesPost[0].onApprovedAR).not.toEqual(objectivesPre[0].onApprovedAR);

    await Approval.update(
      { calculatedStatus: REPORT_STATUSES.NEEDS_ACTION },
      {
        where: {
          entityType: ENTITY_TYPES.REPORT,
          entityId: report.id,
          tier: 0,
        },
        individualHooks: true,
      },
    );

    const goalsPost2 = await Goal.findAll({
      attributes: [
        'id',
        'onApprovedAR',
      ],
      where: { id: goals.map((g) => g.id) },
    });
    const objectivesPost2 = await Objective.findAll({
      attributes: [
        'id',
        'onApprovedAR',
      ],
      where: { id: objectives.map((o) => o.id) },
    });

    expect(goalsPost2[0].onApprovedAR).not.toEqual(goalsPost[0].onApprovedAR);
    expect(objectivesPost2[0].onApprovedAR).not.toEqual(objectivesPost[0].onApprovedAR);
  });

  it('activityRecipientId', async () => {
    const activityRecipients = await ActivityRecipient.findAll({
      where: { activityReportId: report.id },
    });
    expect(activityRecipients).not.toEqual(null);
    expect(activityRecipients[0].activityRecipientId).toEqual(grant.id);
    expect(activityRecipients[1].activityRecipientId).toEqual(otherEntity.id);
    expect(activityRecipients[2].activityRecipientId).toEqual(null);
  });
  it('name', async () => {
    try {
      const activityRecipients = await ActivityRecipient.findAll({
        where: { activityReportId: report.id },
      });
      expect(activityRecipients[0].name).toEqual(grant.name);
      expect(activityRecipients[1].name).toEqual(otherEntity.name);
      expect(activityRecipients[2].name).toEqual(null);
    } catch (e) {
      auditLogger.error(JSON.stringify(e));
      throw e;
    }
  });
});
