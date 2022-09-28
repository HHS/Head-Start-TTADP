import { Op } from 'sequelize';
import faker from '@faker-js/faker';
import db, {
  Recipient,
  Grant,
  Goal,
  ActivityReportObjective,
  ActivityReportGoal,
  Objective,
  Topic,
  Role,
  ObjectiveTopic,
  ObjectiveResource,
  ObjectiveRole,
  ObjectiveFile,
  ActivityReport,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveRole,
  ActivityReportObjectiveTopic,
  File,
} from '../../models';
import { createReport, destroyReport } from '../../testUtils';

import { goalByIdAndRecipient, saveGoalsForReport } from '../goals';
import { FILE_STATUSES, REPORT_STATUSES } from '../../constants';

describe('goalById', () => {
  let grantRecipient;
  let grantForReport;
  let report;
  let goalOnActivityReport;
  let objective;
  let file;
  let file2;
  let role;
  let role2;
  let topic;
  let topic2;

  beforeAll(async () => {
    grantRecipient = await Recipient.create({
      id: faker.datatype.number({ min: 64000 }),
      name: faker.random.alphaNumeric(6),
      uei: faker.datatype.string(12),
    });

    grantForReport = await Grant.create({
      number: grantRecipient.id,
      recipientId: grantRecipient.id,
      programSpecialistName: faker.name.firstName(),
      regionId: 1,
      id: faker.datatype.number({ min: 64000 }),
    });

    goalOnActivityReport = await Goal.create({
      name: 'Goal on activity report',
      status: 'In Progress',
      timeframe: '12 months',
      grantId: grantForReport.id,
      isFromSmartsheetTtaPlan: false,
      id: faker.datatype.number({ min: 64000 }),
    });

    objective = await Objective.create({
      goalId: goalOnActivityReport.id,
      title: 'objective test',
      status: 'Not Started',
    });

    topic = await Topic.findOne();
    topic2 = await Topic.findOne({
      where: {
        id: {
          [Op.notIn]: [topic.id],
        },
      },
    });

    await ObjectiveTopic.create({
      topicId: topic.id,
      objectiveId: objective.id,
    });

    await ObjectiveTopic.create({
      topicId: topic2.id,
      objectiveId: objective.id,
    });

    await ObjectiveResource.create({
      objectiveId: objective.id,
      userProvidedUrl: 'http://www.google.com',
    });

    await ObjectiveResource.create({
      objectiveId: objective.id,
      userProvidedUrl: 'http://www.google1.com',
    });

    role = await Role.findOne();
    role2 = await Role.findOne({
      where: {
        id: {
          [Op.notIn]: [role.id],
        },
      },
    });

    await ObjectiveRole.create({
      objectiveId: objective.id,
      roleId: role.id,
    });

    await ObjectiveRole.create({
      objectiveId: objective.id,
      roleId: role2.id,
    });

    file = await File.create({
      originalFileName: 'gibbery-pibbery.txt',
      key: 'gibbery-pibbery.key',
      status: FILE_STATUSES.UPLOADED,
      fileSize: 1234,
    });

    file2 = await File.create({
      originalFileName: 'gibbery-pibbery2.txt',
      key: 'gibbery-pibbery2.key',
      status: FILE_STATUSES.UPLOADED,
      fileSize: 1234,
    });

    await ObjectiveFile.create({
      objectiveId: objective.id,
      fileId: file.id,
    });

    await ObjectiveFile.create({
      objectiveId: objective.id,
      fileId: file2.id,
    });

    report = await createReport({
      regionId: 1,
      activityRecipients: [
        { grantId: grantForReport.id },
      ],
      approval: {
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
      },
    });

    await ActivityReportObjective.create({
      activityReportId: report.id,
      objectiveId: objective.id,
      ttaProvided: 'asdfadf',
      status: objective.status,
    });
  });

  afterAll(async () => {
    const aro = await ActivityReportObjective.findAll({
      where: {
        activityReportId: report.id,
      },
      individualHooks: true,
    });

    const aroIds = aro.map((a) => a.id);

    await ActivityReportObjectiveTopic.destroy({
      where: {
        activityReportObjectiveId: aroIds,
      },
    });

    await ActivityReportObjectiveResource.destroy({
      where: {
        activityReportObjectiveId: aroIds,
      },
    });

    await ActivityReportObjectiveRole.destroy({
      where: {
        activityReportObjectiveId: aroIds,
      },
    });

    await ActivityReportObjectiveFile.destroy({
      where: {
        activityReportObjectiveId: aroIds,
      },
    });

    await ActivityReportObjective.destroy({
      where: {
        id: aroIds,
      },
    });

    await ObjectiveTopic.destroy({
      where: {
        objectiveId: objective.id,
      },
      individualHooks: true,
    });

    await ObjectiveFile.destroy({
      where: {
        objectiveId: objective.id,
      },
    });

    await File.destroy({
      where: {
        id: [file.id, file2.id],
      },
    });

    await ObjectiveResource.destroy({
      where: {
        objectiveId: objective.id,
      },
      individualHooks: true,
    });

    await Objective.destroy({
      where: {
        goalId: goalOnActivityReport.id,
      },
      individualHooks: true,
    });

    await ActivityReportGoal.destroy({
      where: {
        activityReportId: report.id,
      },
    });

    await destroyReport(report);

    await Goal.destroy({
      where: {
        id: goalOnActivityReport.id,
      },
      individualHooks: true,
    });

    await Grant.destroy({
      where: {
        id: grantForReport.id,
      },
      individualHooks: true,
    });

    await Recipient.destroy({
      where: {
        id: grantRecipient.id,
      },
      individualHooks: true,
    });

    await db.sequelize.close();
  });

  it('retrieves a goal with associated data', async () => {
    const goal = await goalByIdAndRecipient(goalOnActivityReport.id, grantRecipient.id);
    // seems to be something with the aliasing attributes that requires
    // them to be accessed in this way
    expect(goal.dataValues.name).toBe('Goal on activity report');
    expect(goal.objectives.length).toBe(1);

    const [obj] = goal.objectives;

    expect(obj.activityReports.length).toBe(0);

    expect(obj.topics.length).toBe(2);
    expect(obj.topics.map((t) => `${t.dataValues.onAnyReport}`).sort()).toEqual(['false', 'false']);
    expect(obj.topics.map((t) => `${t.dataValues.isOnApprovedReport}`).sort()).toEqual(['false', 'false']);

    expect(obj.resources.length).toBe(2);
    expect(obj.resources.map((r) => `${r.dataValues.onAnyReport}`).sort()).toEqual(['false', 'false']);
    expect(obj.resources.map((r) => `${r.dataValues.isOnApprovedReport}`).sort()).toEqual(['false', 'false']);

    expect(obj.roles.length).toBe(2);
    expect(obj.roles.map((r) => `${r.dataValues.onAnyReport}`).sort()).toEqual(['false', 'false']);
    expect(obj.roles.map((r) => `${r.dataValues.isOnApprovedReport}`).sort()).toEqual(['false', 'false']);

    expect(obj.files.length).toBe(2);
    expect(obj.files.map((f) => `${f.dataValues.onAnyReport}`).sort()).toEqual(['false', 'false']);
    expect(obj.files.map((r) => `${r.dataValues.isOnApprovedReport}`).sort()).toEqual(['false', 'false']);
  });

  it('lets us know when the associated data is on an activity report', async () => {
    await saveGoalsForReport([
      {
        id: goalOnActivityReport.id,
        isNew: false,
        grantIds: [grantForReport.id],
        createdVia: 'rtr',
        status: 'Not Started',
        name: goalOnActivityReport.name,
        goalIds: [goalOnActivityReport.id],
        objectives: [
          {
            id: objective.id,
            isNew: false,
            ttaProvided: '<p>asdfadsfasdlfkm</p>',
            ActivityReportObjective: {},
            title: objective.title,
            status: objective.status,
            resources: [
              { value: 'http://www.google.com' },
            ],
            topics: [
              { value: topic.id },
            ],
            roles: [
              { id: role.id },
            ],
            files: [
              { id: file.id },
            ],
          },
        ],
      },
    ], report);

    const goal = await goalByIdAndRecipient(goalOnActivityReport.id, grantRecipient.id);
    // seems to be something with the aliasing attributes that requires
    // them to be accessed in this way
    expect(goal.dataValues.name).toBe('Goal on activity report');
    expect(goal.objectives.length).toBe(1);
    expect(goal.grant.id).toBe(grantForReport.id);

    const [obj] = goal.objectives;

    expect(obj.activityReports.length).toBe(1);
    expect(obj.activityReports[0].id).toBe(report.id);

    expect(obj.topics.length).toBe(2);
    expect(obj.topics.map((t) => `${t.dataValues.onAnyReport}`).sort()).toEqual(['false', 'true']);
    expect(obj.topics.map((t) => `${t.dataValues.isOnApprovedReport}`).sort()).toEqual(['false', 'false']);

    expect(obj.resources.length).toBe(2);
    expect(obj.resources.map((r) => `${r.dataValues.onAnyReport}`).sort()).toEqual(['false', 'true']);
    expect(obj.resources.map((r) => `${r.dataValues.isOnApprovedReport}`).sort()).toEqual(['false', 'false']);

    expect(obj.roles.length).toBe(2);
    expect(obj.roles.map((r) => `${r.dataValues.onAnyReport}`).sort()).toEqual(['false', 'true']);
    expect(obj.roles.map((r) => `${r.dataValues.isOnApprovedReport}`).sort()).toEqual(['false', 'false']);

    expect(obj.files.length).toBe(2);
    expect(obj.files.map((f) => `${f.dataValues.onAnyReport}`).sort()).toEqual(['false', 'true']);
    expect(obj.files.map((r) => `${r.dataValues.isOnApprovedReport}`).sort()).toEqual(['false', 'false']);
  });

  it('lets us know when the associated data is on an approved activity report', async () => {
    await ActivityReport.update({
      submittedStatus: 'approved',
      calculatedStatus: 'approved',
    }, {
      where: {
        id: report.id,
      },
    });
    const goal = await goalByIdAndRecipient(goalOnActivityReport.id, grantRecipient.id);
    expect(goal.dataValues.name).toBe('Goal on activity report');
    expect(goal.objectives.length).toBe(1);
    expect(goal.grant.id).toBe(grantForReport.id);

    const [obj] = goal.objectives;

    expect(obj.activityReports.length).toBe(1);
    expect(obj.activityReports[0].id).toBe(report.id);

    expect(obj.topics.length).toBe(2);
    expect(obj.topics.map((t) => `${t.dataValues.onAnyReport}`).sort()).toEqual(['false', 'true']);
    expect(obj.topics.map((t) => `${t.dataValues.isOnApprovedReport}`).sort()).toEqual(['false', 'true']);

    expect(obj.resources.length).toBe(2);
    expect(obj.resources.map((r) => `${r.dataValues.onAnyReport}`).sort()).toEqual(['false', 'true']);
    expect(obj.resources.map((r) => `${r.dataValues.isOnApprovedReport}`).sort()).toEqual(['false', 'true']);

    expect(obj.roles.length).toBe(2);
    expect(obj.roles.map((r) => `${r.dataValues.onAnyReport}`).sort()).toEqual(['false', 'true']);
    expect(obj.roles.map((r) => `${r.dataValues.isOnApprovedReport}`).sort()).toEqual(['false', 'true']);

    expect(obj.files.length).toBe(2);
    expect(obj.files.map((f) => `${f.dataValues.onAnyReport}`).sort()).toEqual(['false', 'true']);
    expect(obj.files.map((r) => `${r.dataValues.isOnApprovedReport}`).sort()).toEqual(['false', 'true']);
  });
});
