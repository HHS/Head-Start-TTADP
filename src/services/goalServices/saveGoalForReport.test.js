import faker from '@faker-js/faker';
import db, {
  Goal,
  Grant,
  Recipient,
  Objective,
  ActivityReport,
  ActivityRecipient,
  ActivityReportGoal,
  ActivityReportObjective,
} from '../../models';
import { REPORT_STATUSES } from '../../constants';
import { saveGoalsForReport } from '../goals';
import { activityReportAndRecipientsById } from '../activityReports';

describe('saveGoalsForReport (more tests)', () => {
  let activityReportForNewGoal;
  let multiRecipientReport;
  let reportWeArentWorryingAbout;
  let grantOne;
  let grantTwo;
  let activityReports = [];
  let recipients = [];
  let grants = [];
  let goal;
  let objective;

  beforeAll(async () => {
    const recipientOne = await Recipient.create(
      {
        id: faker.datatype.number({ min: 90000 }),
        name: faker.company.companyName(),
        uei: faker.datatype.string(12),
      },
    );

    const recipientTwo = await Recipient.create(
      {
        id: faker.datatype.number({ min: 90000 }),
        name: faker.company.companyName(),
        uei: faker.datatype.string(12),
      },
    );

    recipients = [recipientOne, recipientTwo];

    grantOne = await Grant.create(
      {
        id: recipientOne.id,
        number: faker.datatype.number({ min: 90000 }),
        recipientId: recipientOne.id,
      },
    );
    grantTwo = await Grant.create(
      {
        id: recipientTwo.id,
        number: faker.datatype.number({ min: 90000 }),
        recipientId: recipientTwo.id,
      },
    );

    grants = [grantOne, grantTwo];

    // Activity report for adding a new goal
    activityReportForNewGoal = await ActivityReport.create({
      submissionStatus: REPORT_STATUSES.DRAFT,
      regionId: 1,
      userId: 1,
      activityRecipientType: 'recipient',
    });

    // Activity report for multiple recipients
    multiRecipientReport = await ActivityReport.create({
      submissionStatus: REPORT_STATUSES.DRAFT,
      regionId: 1,
      userId: 1,
      activityRecipientType: 'recipient',
    });

    reportWeArentWorryingAbout = await ActivityReport.create({
      submissionStatus: REPORT_STATUSES.DRAFT,
      regionId: 1,
      userId: 1,
      activityRecipientType: 'recipient',
    });

    activityReports = [
      activityReportForNewGoal,
      multiRecipientReport,
      reportWeArentWorryingAbout,
    ];

    await ActivityRecipient.create({
      activityReportId: activityReportForNewGoal.id,
      grantId: grantOne.id,
    });

    await ActivityRecipient.create({
      activityReportId: multiRecipientReport.id,
      grantId: grantOne.id,
    });

    await ActivityRecipient.create({
      activityReportId: multiRecipientReport.id,
      grantId: grantTwo.id,
    });

    await ActivityRecipient.create({
      activityReportId: reportWeArentWorryingAbout.id,
      grantId: grantOne.id,
    });

    goal = await Goal.create({
      name: 'This is an existing goal',
      status: 'In Progress',
      grantId: grantOne.id,
      previousStatus: 'Not Started',
    });

    await ActivityReportGoal.create({
      goalId: goal.id,
      activityReportId: reportWeArentWorryingAbout.id,
    });

    objective = await Objective.create({
      goalId: goal.id,
      status: 'In Progress',
      title: 'This is an existing objective',
    });

    await ActivityReportObjective.create({
      ttaProvided: 'Some delightful TTA',
      activityReportId: reportWeArentWorryingAbout.id,
      objectiveId: objective.id,
    });
  });

  afterAll(async () => {
    const reportIds = activityReports.map((report) => report.id);

    const arObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: reportIds,
      },
    });

    const objectiveIds = arObjectives.map((aro) => aro.objectiveId);

    await ActivityReportObjective.destroy({
      where: {
        activityReportId: reportIds,
      },
    });

    await Objective.destroy({
      where: {
        id: objectiveIds,
      },
    });

    await ActivityReportGoal.destroy({
      where: {
        activityReportId: reportIds,
      },
    });

    await Goal.destroy({
      where: {
        grantId: [grantOne.id, grantTwo.id],
      },
    });

    await ActivityRecipient.destroy({
      where: {
        activityReportId: reportIds,
      },
    });

    await ActivityReport.destroy({
      where: {
        id: reportIds,
      },
    });

    await Promise.all(
      grants.map(async (g) => Grant.destroy({ where: { id: g.id } })),
    );

    await Promise.all(
      recipients.map(async (r) => Recipient.destroy({ where: { id: r.id } })),
    );

    await db.sequelize.close();
  });

  it('adds a new goal', async () => {
    const beforeGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(beforeGoals.length).toBe(0);

    const beforeObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(beforeObjectives.length).toBe(0);

    const [savedReport] = await activityReportAndRecipientsById(activityReportForNewGoal.id);

    const goalName = 'This is a brand new goal';
    const beforeGoalId = '8768fdd6-99e1-4d21-adb4-032f3413e60e';

    const newObjective = {
      title: 'This is a brand new objective',
      ttaProvided: '<p>Test objective TTA</p>\n',
      status: 'Not Started',
      id: '02f1ec1d-4163-4a9a-9b32-adddf336f990',
      isNew: true,
    };

    const newGoals = [
      {
        id: beforeGoalId,
        isNew: true,
        name: goalName,
        objectives: [newObjective],
        grantIds: [grantOne.id],
        status: 'Not Started',
      }];

    await saveGoalsForReport(newGoals, savedReport);

    const afterGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterGoals.length).toBe(1);

    const [goalId] = afterGoals.map((ag) => ag.goalId);

    expect(goalId).not.toBe(beforeGoalId);

    const savedGoal = await Goal.findByPk(goalId);

    expect(savedGoal.name).toBe(goalName);
    expect(savedGoal.grantId).toBe(grantOne.id);

    const afterObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterObjectives.length).toBe(1);

    const [afterObjective] = afterObjectives;

    expect(afterObjective.ttaProvided).toBe(newObjective.ttaProvided);

    const savedObjective = await Objective.findByPk(afterObjective.objectiveId);
    expect(savedObjective.title).toBe(newObjective.title);
    expect(savedObjective.status).toBe(newObjective.status);
  });

  it('removes unused objectives', async () => {
    const beforeGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(beforeGoals.length).toBe(1);

    const beforeObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(beforeObjectives.length).toBe(1);

    const [savedReport] = await activityReportAndRecipientsById(activityReportForNewGoal.id);

    const goalName = 'This is a brand new goal';
    const [beforeGoal] = beforeGoals;

    const newGoals = [
      {
        goalIds: [beforeGoal.goalId],
        name: goalName,
        objectives: [],
        grantIds: [grantOne.id],
        status: 'Not Started',
      },
    ];

    await saveGoalsForReport(newGoals, savedReport);

    const afterGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterGoals.length).toBe(1);

    const [goalId] = afterGoals.map((ag) => ag.goalId);

    expect(goalId).toBe(beforeGoal.goalId);

    const savedGoal = await Goal.findByPk(goalId);

    expect(savedGoal.name).toBe(goalName);
    expect(savedGoal.grantId).toBe(grantOne.id);

    const afterObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterObjectives.length).toBe(0);
  });

  it('adds multi recipient goals', async () => {
    const beforeGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: multiRecipientReport.id,
      },
    });

    expect(beforeGoals.length).toBe(0);

    const beforeObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: multiRecipientReport.id,
      },
    });

    expect(beforeObjectives.length).toBe(0);

    const [savedReport] = await activityReportAndRecipientsById(multiRecipientReport.id);

    const goalName = 'This is a brand new goal for a multi recipient report';
    const beforeGoalId = '8768fdd6-99e1-4d21-adb4-032f3413e60e';

    const newObjective = {
      title: 'This is a brand new objective for a multi recipient report',
      ttaProvided: '<p>Test objective TTA</p>\n',
      status: 'Not Started',
      id: '02f1ec1d-4163-4a9a-9b32-adddf336f990',
      isNew: true,
    };

    const newGoals = [
      {
        id: beforeGoalId,
        isNew: true,
        name: goalName,
        objectives: [newObjective],
        grantIds: [grantOne.id, grantTwo.id],
        status: 'Not Started',
      }];

    await saveGoalsForReport(newGoals, savedReport);

    const afterGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: multiRecipientReport.id,
      },
    });

    expect(afterGoals.length).toBe(2);

    const [goalId, secondGoalId] = afterGoals.map((ag) => ag.goalId);

    const savedGoal = await Goal.findByPk(goalId);
    expect(savedGoal.name).toBe(goalName);

    const secondSavedGoal = await Goal.findByPk(secondGoalId);
    expect(secondSavedGoal.name).toBe(goalName);

    expect([savedGoal.grantId, secondSavedGoal.grantId]).toContain(grantOne.id);
    expect([savedGoal.grantId, secondSavedGoal.grantId]).toContain(grantTwo.id);

    const afterObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: multiRecipientReport.id,
      },
    });

    expect(afterObjectives.length).toBe(2);

    const [afterObjective, afterObjectiveTwo] = afterObjectives;

    expect(afterObjective.ttaProvided).toBe(newObjective.ttaProvided);

    const savedObjective = await Objective.findByPk(afterObjective.objectiveId);
    expect(savedObjective.title).toBe(newObjective.title);
    expect(savedObjective.status).toBe(newObjective.status);

    expect(afterObjectiveTwo.ttaProvided).toBe(newObjective.ttaProvided);

    const savedObjectiveTwo = await Objective.findByPk(afterObjectiveTwo.objectiveId);
    expect(savedObjectiveTwo.title).toBe(newObjective.title);
    expect(savedObjectiveTwo.status).toBe(newObjective.status);

    expect([savedObjectiveTwo.goalId, savedObjective.goalId]).toContain(goalId);
    expect([savedObjectiveTwo.goalId, savedObjective.goalId]).toContain(secondGoalId);
  });

  it('edits existing goals', async () => {
    const beforeGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(beforeGoals.length).toBe(1);

    const beforeObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(beforeObjectives.length).toBe(0);

    const [savedReport] = await activityReportAndRecipientsById(activityReportForNewGoal.id);
    const [beforeGoal] = beforeGoals;
    const existingGoal = await Goal.findByPk(beforeGoal.goalId);
    const otherExistingGoal = await Goal.findByPk(goal.id);

    const newGoals = [
      {
        goalIds: existingGoal.id,
        id: existingGoal.id,
        name: existingGoal.name,
        objectives: [],
        grantIds: [grantOne.id],
        status: 'Not Started',
      },
      {
        goalIds: [otherExistingGoal.id],
        id: otherExistingGoal.id,
        name: otherExistingGoal.name,
        objectives: [],
        grantIds: [grantOne.id],
        status: 'Closed',
      },
    ];

    await saveGoalsForReport(newGoals, savedReport);

    const afterObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterObjectives.length).toBe(0);

    const afterGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterGoals.length).toBe(2);

    const goalIds = afterGoals.map((ag) => ag.goalId);
    expect(goalIds).toContain(existingGoal.id);
    expect(goalIds).toContain(otherExistingGoal.id);

    const updatedGoal = await Goal.findByPk(otherExistingGoal.id);
    expect(updatedGoal.status).toBe('Closed');
  });

  it('removes unused goals', async () => {
    const beforeGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(beforeGoals.length).toBe(2);

    const beforeObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(beforeObjectives.length).toBe(0);

    const [savedReport] = await activityReportAndRecipientsById(activityReportForNewGoal.id);
    const [beforeGoal] = beforeGoals;
    const existingGoal = await Goal.findByPk(beforeGoal.goalId);

    const newGoals = [
      {
        goalIds: [existingGoal.id],
        id: existingGoal.id,
        name: existingGoal.name,
        objectives: [],
        grantIds: [grantOne.id],
        status: 'Not Started',
      },
    ];

    await saveGoalsForReport(newGoals, savedReport);

    const afterObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterObjectives.length).toBe(0);

    const afterGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterGoals.length).toBe(1);

    const goalIds = afterGoals.map((ag) => ag.goalId);
    expect(goalIds).toContain(existingGoal.id);
  });
});
