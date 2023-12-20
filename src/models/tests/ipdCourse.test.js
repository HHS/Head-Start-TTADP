import { REPORT_STATUSES } from '@ttahub/common';
import db, {
  User,
  IpdCourse,
  Recipient,
  Grant,
  Goal,
  Objective,
  ActivityReport,
  ActivityReportGoal,
  ActivityReportObjective,
  ObjectiveIpdCourse,
  ActivityReportObjectiveIpdCourse,
} from '..';

const mockUser = {
  name: 'Tim Test',
  role: ['TTAC'],
  phoneNumber: '555-555-554',
  hsesUserId: '65536',
  hsesUsername: 'test50@test50.com',
  hsesAuthorities: ['ROLE_FEDERAL'],
  email: 'timtest50@test50.com',
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

const mockGrant = {
  regionId: 1,
  status: 'Active',
  startDate: new Date('2023-02-09T15:13:00.000Z'),
  endDate: new Date('2023-02-09T15:13:00.000Z'),
  cdi: false,
  grantSpecialistName: null,
  grantSpecialistEmail: null,
  stateCode: 'NY',
  annualFundingMonth: 'October',
};

const sampleReport = {
  submissionStatus: REPORT_STATUSES.DRAFT,
  calculatedStatus: REPORT_STATUSES.DRAFT,
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
  version: 2,
};

describe('ipdCourse', () => {
  let user;
  let ipdCourse;
  let updateCourse;
  let report;
  let recipient;
  let grant;
  let goal;
  let objective;
  let activityReportGoal;
  let activityReportObjective;
  let objectiveIpdCourses;
  let activityReportObjectiveIpdCourse;

  beforeAll(async () => {
    // Create mock user.
    user = await User.create({ ...mockUser });

    // Create recipient.
    recipient = await Recipient.create({
      id: 534935,
      uei: 'NNA5N2KGHGM2',
      name: 'IPD Recipient',
      recipientType: 'IPD Recipient',
    });

    // Create grant.
    grant = await Grant.create({
      ...mockGrant,
      id: 472968,
      number: '28978D82',
      recipientId: recipient.id,
      programSpecialistName: user.name,
      programSpecialistEmail: user.email,
    });

    // Create goal.
    goal = await Goal.create(
      {
        name: 'ipd course goal 1',
        grantId: grant.id,
      },
    );

    // Create objective.
    objective = await Objective.create(
      {
        title: 'IPD course objective ',
        goalId: goal.id,
        status: 'Not Started',
      },
    );

    // Create activity report.
    report = await ActivityReport.create(sampleReport);

    // Create activity report goal.
    activityReportGoal = await ActivityReportGoal.create({
      activityReportId: report.id,
      goalId: goal.id,
      isActivelyEdited: false,
    });

    // Create activity report objective.
    activityReportObjective = await ActivityReportObjective.create({
      objectiveId: objective.id,
      activityReportId: goal.id,
      ttaProvided: 'ipd aro Goal',
      status: objective.status,
    });

    // Create IpdCourse.
    ipdCourse = await IpdCourse.create({
      name: 'Test IpdCourse',
    });

    // Create another course.
    updateCourse = await IpdCourse.create({
      name: 'Test IpdCourse 2',
    });

    // Create ObjectiveIpdCourse.
    objectiveIpdCourses = await ObjectiveIpdCourse.create({
      objectiveId: objective.id,
      ipdCourseId: ipdCourse.id,
    });

    // Create ActivityReportObjectiveIpdCourse.
    activityReportObjectiveIpdCourse = await ActivityReportObjectiveIpdCourse.create({
      activityReportObjectiveId: activityReportObjective.id,
      ipdCourseId: ipdCourse.id,
    });
  });

  afterAll(async () => {
    // Delete ActivityReportObjectiveIpdCourse.
    await ActivityReportObjectiveIpdCourse.destroy({
      where: {
        id: activityReportObjectiveIpdCourse.id,
      },
    });

    // Delete ObjectiveIpdCourse.
    await ObjectiveIpdCourse.destroy({
      where: {
        id: objectiveIpdCourses.id,
      },
    });

    // Delete IpdCourse.
    await IpdCourse.destroy({
      where: {
        id: [ipdCourse.id, updateCourse.id],
      },
      force: true,
    });

    // Delete activity report objective.
    await ActivityReportObjective.destroy({
      where: {
        id: activityReportObjective.id,
      },
    });

    // Delete activity report goal.
    await ActivityReportGoal.destroy({
      where: {
        id: activityReportGoal.id,
      },
    });

    // Delete activity report.
    await ActivityReport.destroy({
      where: {
        id: report.id,
      },
    });

    // Delete objective.
    await Objective.destroy({
      where: {
        id: objective.id,
      },
      force: true,
    });

    // Delete goal.
    await Goal.destroy({
      where: {
        id: goal.id,
      },
      force: true,
    });

    // Delete grant.
    await Grant.destroy({
      where: {
        id: grant.id,
      },
      force: true,
    });

    // Delete recipient.
    await Recipient.destroy({
      where: {
        id: recipient.id,
      },
    });

    // Delete mock user.
    await User.destroy({
      where: {
        id: user.id,
      },
    });

    await db.sequelize.close();
  });

  it('Update IpdCourse', async () => {
    const newIpdCourseName = 'Test IpdCourse Updated';
    ipdCourse.name = newIpdCourseName;
    await IpdCourse.update({
      name: newIpdCourseName,
    }, {
      where: {
        id: ipdCourse.id,
      },
    });
    ipdCourse = await IpdCourse.findByPk(ipdCourse.id);
    expect(ipdCourse.name).toBe(newIpdCourseName);
  });

  it('Objective course', async () => {
    const objectiveIpdCourse = await ObjectiveIpdCourse.findOne({
      where: {
        objectiveId: objective.id,
      },
    });
    expect(objectiveIpdCourse.ipdCourseId).toBe(ipdCourse.id);

    // Update objective course.
    objectiveIpdCourse.ipdCourseId = updateCourse.id;
    await ObjectiveIpdCourse.update({
      ipdCourseId: updateCourse.id,
    }, {
      where: {
        id: objectiveIpdCourse.id,
      },
    });
    const updatedObjectiveIpdCourse = await ObjectiveIpdCourse.findByPk(objectiveIpdCourse.id);
    expect(updatedObjectiveIpdCourse.ipdCourseId).toBe(updateCourse.id);
  });

  it('ActivityReportObjective course', async () => {
    const aroIpd = await ActivityReportObjectiveIpdCourse.findOne({
      where: {
        activityReportObjectiveId: activityReportObjective.id,
      },
    });
    expect(aroIpd.ipdCourseId).toBe(ipdCourse.id);

    // Update activity report objective course.
    aroIpd.ipdCourseId = updateCourse.id;
    await ActivityReportObjectiveIpdCourse.update({
      ipdCourseId: updateCourse.id,
    }, {
      where: {
        id: aroIpd.id,
      },
    });
    const updatedAroIpd = await ActivityReportObjectiveIpdCourse.findByPk(aroIpd.id);
    expect(updatedAroIpd.ipdCourseId).toBe(updateCourse.id);
  });
});
