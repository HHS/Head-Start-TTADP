import { Op } from 'sequelize';
import faker from '@faker-js/faker';
import { REPORT_STATUSES, GOAL_SOURCES } from '@ttahub/common';
import db, {
  User,
  Recipient,
  Grant,
  Goal,
  File,
  Role,
  Objective,
  ObjectiveFile,
  ObjectiveResource,
  ObjectiveTopic,
  ActivityReport,
  ActivityRecipient,
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveTopic,
  ActivityReportObjectiveCourse,
  ActivityReportGoalFieldResponse,
  CollaboratorRole,
  Resource,
  Topic,
  Course,
  ObjectiveCourse,
} from '../models';
import {
  cacheGoalMetadata,
  cacheObjectiveMetadata,
  cacheCourses,
} from './reportCache';
import { processObjectiveForResourcesById } from './resource';
import {
  createReport,
  destroyReport,
  createGrant,
  createRecipient,
  createGoal,
} from '../testUtils';
import { GOAL_STATUS } from '../constants';

describe('cacheCourses', () => {
  let courseOne;
  let courseTwo;
  let activityReport;
  let grant;
  let recipient;
  let goal;
  let objective;
  let aro;

  beforeAll(async () => {
    recipient = await createRecipient({});
    grant = await createGrant({ recipientId: recipient.id });

    activityReport = await createReport({
      activityRecipients: [
        {
          grantId: grant.id,
        },
      ],
    });

    goal = await createGoal({ grantId: grant.id, status: GOAL_STATUS.IN_PROGRESS });

    objective = await Objective.create({
      goalId: goal.id,
      title: faker.datatype.string(200),
      status: 'Not Started',
    });

    courseOne = await Course.create({
      name: faker.datatype.string(200),
    });

    courseTwo = await Course.create({
      name: faker.datatype.string(200),
    });

    await ObjectiveCourse.bulkCreate([
      {
        objectiveId: objective.id,
        courseId: courseOne.id,
        onAR: false,
      },
      {
        objectiveId: objective.id,
        courseId: courseTwo.id,
        onAR: false,
      },
    ]);

    aro = await ActivityReportObjective.create({
      objectiveId: objective.id,
      activityReportId: activityReport.id,
    });

    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aro.id,
      courseId: courseOne.id,
    });
  });

  afterAll(async () => {
    await ActivityReportObjectiveCourse.destroy({
      where: {
        courseId: [courseOne.id, courseTwo.id],
      },
    });

    await ObjectiveCourse.destroy({
      where: {
        courseId: [courseOne.id, courseTwo.id],
      },
    });

    await Course.destroy({ where: { id: [courseOne.id, courseTwo.id] } });

    await ActivityReportObjective.destroy({ where: { objectiveId: objective.id } });
    await Objective.destroy({ where: { id: objective.id }, force: true });
    await Goal.destroy({ where: { id: goal.id }, force: true });
    await destroyReport(activityReport);
    await Grant.destroy({ where: { id: grant.id }, individualHooks: true });
    await Recipient.destroy({ where: { id: recipient.id } });
  });

  it('should cache courses', async () => {
    await cacheCourses(objective.id, aro.id, [{ courseId: courseTwo.id }]);

    const aroCourses = await ActivityReportObjectiveCourse.findAll({
      where: {
        activityReportObjectiveId: aro.id,
      },
    });

    expect(aroCourses).toHaveLength(1);
    expect(aroCourses[0].courseId).toEqual(courseTwo.id);
  });
});

describe('cacheGoalMetadata', () => {
  let activityReport;
  let goal;

  const mockUser = {
    id: faker.datatype.number(),
    homeRegionId: 1,
    name: 'user13706689',
    hsesUsername: 'user13706689',
    hsesUserId: 'user13706689',
    lastLogin: new Date(),
  };

  beforeAll(async () => {
    await User.create(mockUser);
    const grantId = faker.datatype.number();

    activityReport = await createReport({
      activityRecipients: [
        {
          grantId,
        },
      ],
      userId: mockUser.id,
    });

    goal = await Goal.create({
      grantId,
      name: faker.lorem.sentence(20),
      status: GOAL_STATUS.DRAFT,
      timeframe: 'Short Term',
      closeSuspendReason: null,
      closeSuspendContext: null,
      endDate: null,
      isRttapa: null,
      isActivelyEdited: false,
      source: GOAL_SOURCES[0],
    });
  });

  afterAll(async () => {
    await ActivityReportGoal.destroy({ where: { activityReportId: activityReport.id } });
    await destroyReport(activityReport);
    await Goal.destroy({ where: { id: goal.id }, force: true });
    await User.destroy({ where: { id: mockUser.id } });
  });

  it('should cache goal metadata', async () => {
    let arg = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReport.id,
        goalId: goal.id,
      },
    });

    expect(arg).toHaveLength(0);

    await cacheGoalMetadata(goal, activityReport.id, false);

    arg = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReport.id,
        goalId: goal.id,
      },
    });

    expect(arg).toHaveLength(1);

    const data = {
      name: goal.name,
      status: GOAL_STATUS.DRAFT,
      timeframe: 'Short Term',
      closeSuspendReason: null,
      closeSuspendContext: null,
      endDate: null,
      isRttapa: null,
      isActivelyEdited: false,
      source: GOAL_SOURCES[0],
    };

    expect(arg[0].dataValues).toMatchObject(data);

    jest.spyOn(ActivityReportGoalFieldResponse, 'destroy');

    await cacheGoalMetadata(goal, activityReport.id, true, [], true);

    arg = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReport.id,
        goalId: goal.id,
      },
    });

    const updatedData = {
      ...data,
      isActivelyEdited: true,
    };
    expect(arg).toHaveLength(1);
    expect(arg[0].dataValues).toMatchObject(updatedData);

    expect(ActivityReportGoalFieldResponse.destroy).toHaveBeenCalled();
  });
});

describe('cacheObjectiveMetadata', () => {
  const mockUser = {
    name: 'Joe Green',
    phoneNumber: '555-555-554',
    hsesUserId: '65535',
    hsesUsername: 'test49@test49.com',
    hsesAuthorities: ['ROLE_FEDERAL'],
    email: 'test49@test49.com',
    homeRegionId: 1,
    lastLogin: new Date('2021-02-09T15:13:00.000Z'),
    flags: [],
  };

  const mockRoles = [
    { name: 'FES', fullName: 'Family Engagement Specialist', isSpecialist: true },
    { name: 'HS', fullName: 'Health Specialist', isSpecialist: true },
    { name: 'ECS', fullName: 'Early Childhood Specialist', isSpecialist: true },
    { name: 'SS', fullName: 'System Specialist', isSpecialist: true },
  ];

  const mockRecipient = {
    id: 6553500,
    uei: 'NNA5N2KHMGM2',
    name: 'Tooth Brushing Academy',
    recipientType: 'Community Action Agency (CAA)',
  };

  const mockGrant = {
    id: 6553500,
    number: '99RC9999',
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

  const mockGoal = {
    name: 'Goal 1',
    id: 20850000,
    status: 'Not Started',
    timeframe: 'None',
    source: GOAL_SOURCES[0],
  };

  const mockObjective = {
    id: 2022081300,
    title: null,
    status: 'Not Started',
  };

  const mockReport = {
    id: 900000,
    submissionStatus: REPORT_STATUSES.DRAFT,
    calculatedStatus: REPORT_STATUSES.DRAFT,
    numberOfParticipants: 1,
    deliveryMethod: 'method',
    duration: 0,
    endDate: '2020-01-01T12:00:00Z',
    startDate: '2020-01-01T12:00:00Z',
    requester: 'requester',
    regionId: 2,
    targetPopulations: [],
    version: 2,
  };

  const mockFiles = [{
    id: 140000001,
    originalFileName: 'test01.pdf',
    key: '508bdc9e-8dec-4d64-b83d-59a72a4f2353.pdf',
    status: 'APPROVED',
    fileSize: 54417,
  }, {
    id: 140000002,
    originalFileName: 'test02.pdf',
    key: '508bdc9e-8dec-4d64-b83d-59a72a4f2354.pdf',
    status: 'APPROVED',
    fileSize: 54417,
  }];

  let mockObjectiveTopics;

  const mockObjectiveResources = [
    'https://ttahub.ohs.acf.hhs.gov/',
    'https://hses.ohs.acf.hhs.gov/',
    'https://eclkc.ohs.acf.hhs.gov/',
  ];

  let user;
  const roles = [];
  let recipient;
  let grant;
  let report;
  let goal;
  let objective;
  let files = [];
  const objectiveFiles = [];
  const objectiveResources = [];
  const objectiveTopics = [];
  const topics = [];
  let courseOne;
  let courseTwo;

  beforeAll(async () => {
    [user] = await User.findOrCreate({ where: { ...mockUser } });
    roles.push((await Role.findOrCreate({ where: { ...mockRoles[0] } }))[0]);
    roles.push((await Role.findOrCreate({ where: { ...mockRoles[1] } }))[0]);
    roles.push((await Role.findOrCreate({ where: { ...mockRoles[2] } }))[0]);
    roles.push((await Role.findOrCreate({ where: { ...mockRoles[3] } }))[0]);
    [recipient] = await Recipient.findOrCreate({ where: { ...mockRecipient } });
    [grant] = await Grant.findOrCreate({
      where: {
        ...mockGrant,
        recipientId: recipient.id,
        programSpecialistName: user.name,
        programSpecialistEmail: user.email,
      },
    });
    [report] = await ActivityReport.findOrCreate({ where: { ...mockReport } });
    await ActivityRecipient.findOrCreate({
      where: {
        activityReportId: report.id,
        grantId: grant.id,
      },
    });
    [goal] = await Goal.findOrCreate({ where: { ...mockGoal, grantId: mockGrant.id } });
    [objective] = await Objective.findOrCreate({ where: { ...mockObjective, goalId: goal.id } });
    await Promise.all(mockFiles.map(
      async (mockFile) => File.findOrCreate({ where: { ...mockFile } }),
    ));
    files = await File.findAll({ where: { id: mockFiles.map((mockFile) => mockFile.id) }, order: ['id'] });
    objectiveFiles.push(await ObjectiveFile.findOrCreate({
      where: {
        objectiveId: objective.id,
        fileId: files[0].id,
      },
    }));
    objectiveResources.push(await processObjectiveForResourcesById(
      objective.id,
      [mockObjectiveResources[0]],
    ));

    courseOne = await Course.create({
      name: faker.datatype.string(200),
    });

    courseTwo = await Course.create({
      name: faker.datatype.string(200),
    });

    await ObjectiveCourse.bulkCreate([
      {
        objectiveId: objective.id,
        courseId: courseOne.id,
      },
      {
        objectiveId: objective.id,
        courseId: courseTwo.id,
      },
    ]);

    topics.push((await Topic.findOrCreate({ where: { name: 'Coaching' } })));
    topics.push((await Topic.findOrCreate({ where: { name: 'Communication' } })));
    topics.push((await Topic.findOrCreate({ where: { name: 'Community and Self-Assessment' } })));
    mockObjectiveTopics = topics.map((topic) => ({ topicId: topic[0].id }));
    objectiveTopics.push(await ObjectiveTopic.findOrCreate({
      where: { objectiveId: objective.id, ...mockObjectiveTopics[0] },
    }));
  });

  afterAll(async () => {
    await ObjectiveTopic.destroy({ where: { objectiveId: objective.id } });
    await ObjectiveResource.destroy({ where: { objectiveId: objective.id } });
    await ObjectiveFile.destroy({ where: { objectiveId: objective.id } });
    await ObjectiveCourse.destroy({ where: { objectiveId: objective.id } });
    await ActivityRecipient.destroy({
      where: {
        [Op.or]: [
          { activityReportId: report.id },
          { grantId: mockGrant.id },
        ],
      },
    });
    await ActivityReportGoal.destroy({ where: { goalId: goal.id } });
    const aroFiles = await ActivityReportObjectiveFile
      .findAll({ include: { model: ActivityReportObjective, as: 'activityReportObjective', where: { objectiveId: objective.id } } });
    await ActivityReportObjectiveFile
      .destroy({ where: { id: { [Op.in]: aroFiles.map((aroFile) => aroFile.id) } } });
    const aroResources = await ActivityReportObjectiveResource
      .findAll({ include: { model: ActivityReportObjective, as: 'activityReportObjective', where: { objectiveId: objective.id } } });
    await ActivityReportObjectiveResource
      .destroy({ where: { id: { [Op.in]: aroResources.map((aroResource) => aroResource.id) } } });
    const aroTopics = await ActivityReportObjectiveTopic
      .findAll({ include: { model: ActivityReportObjective, as: 'activityReportObjective', where: { objectiveId: objective.id } } });
    await ActivityReportObjectiveTopic
      .destroy({ where: { id: { [Op.in]: aroTopics.map((aroTopic) => aroTopic.id) } } });
    const aroCourses = await ActivityReportObjectiveCourse
      .findAll({ include: { model: ActivityReportObjective, as: 'activityReportObjective', where: { objectiveId: objective.id } } });
    await ActivityReportObjectiveTopic
      .destroy({ where: { id: { [Op.in]: aroCourses.map((c) => c.id) } } });
    await ActivityReportObjective.destroy({ where: { objectiveId: objective.id } });
    await ActivityReport.destroy({ where: { id: report.id } });
    await Objective.destroy({ where: { id: objective.id }, force: true });
    await Goal.destroy({ where: { id: goal.id }, force: true });
    await Grant.destroy({ where: { id: grant.id }, individualHooks: true });
    await Course.destroy({ where: { id: [courseOne.id, courseTwo.id] } });
    await Recipient.destroy({ where: { id: recipient.id } });
    await Promise.all(roles.map(async (role) => CollaboratorRole.destroy({
      where: { roleId: role.id },
    })));
    await Promise.all(roles.map(async (role) => role.destroy()));
    await Promise.all(files.map(async (file) => file.destroy()));
    await User.destroy({ where: { id: user.id } });
    await db.sequelize.close();
  });

  describe('cache', () => {
    it('null', async () => {
      {
        const arg = await ActivityReportGoal.findOne({ where: { activityReportId: report.id } });
        const aro = await ActivityReportObjective.findOne({
          where: { activityReportId: report.id },
          include: [{
            model: ActivityReportObjectiveFile,
            as: 'activityReportObjectiveFiles',
          }, {
            model: ActivityReportObjectiveResource,
            as: 'activityReportObjectiveResources',
            include: [{
              model: Resource,
              as: 'resource',
            }],
          }, {
            model: ActivityReportObjectiveTopic,
            as: 'activityReportObjectiveTopics',
          }],
        });

        expect(arg).toBeNull();
        expect(aro).toBeNull();
      }
      // });
      // i t('initial set', async () => {
      {
        await ActivityReportGoal.create({ activityReportId: report.id, goalId: goal.id });
        await ActivityReportObjective.create({
          activityReportId: report.id,
          objectiveId: objective.id,
        });
        const arg = await ActivityReportGoal.findOne({ where: { activityReportId: report.id } });
        const aro = await ActivityReportObjective.findOne({
          where: { activityReportId: report.id },
          include: [{
            model: ActivityReportObjectiveFile,
            as: 'activityReportObjectiveFiles',
          }, {
            model: ActivityReportObjectiveResource,
            as: 'activityReportObjectiveResources',
            include: [{
              model: Resource,
              as: 'resource',
            }],
          }, {
            model: ActivityReportObjectiveTopic,
            as: 'activityReportObjectiveTopics',
          }, {
            model: ActivityReportObjectiveCourse,
            as: 'activityReportObjectiveCourses',
            include: [{
              model: Course,
              as: 'course',
            }],
          }],
        });
        expect(arg).toBeDefined();
        expect(aro).toBeDefined();
        expect(aro.activityReportObjectiveFiles).toEqual([]);
        expect(aro.activityReportObjectiveResources).toEqual([]);
        expect(aro.activityReportObjectiveTopics).toEqual([]);
        expect(aro.activityReportObjectiveTopics).toEqual([]);
        expect(aro.activityReportObjectiveCourses).toEqual([]);
      }
      // });
      // i t('add to cache', async () => {
      {
        const filesForThisObjective = await ObjectiveFile.findAll({
          where: {
            objectiveId: objective.id,
          },
        });

        const resources = await ObjectiveResource.findAll({
          where: {
            objectiveId: objective.id,
          },
        });

        const topicsForThisObjective = await ObjectiveTopic.findAll({
          where: {
            objectiveId: objective.id,
          },
        });

        const coursesForThisObjective = await ObjectiveCourse.findAll({
          where: {
            objectiveId: objective.id,
          },
        });

        const metadata = {
          files: filesForThisObjective,
          resources,
          topics: topicsForThisObjective,
          courses: coursesForThisObjective,
          ttaProvided: null,
          order: 1,
        };
        await cacheObjectiveMetadata(objective, report.id, metadata);
        const aro = await ActivityReportObjective.findOne({
          where: { activityReportId: report.id },
          include: [{
            model: ActivityReportObjectiveFile,
            as: 'activityReportObjectiveFiles',
          }, {
            model: ActivityReportObjectiveResource,
            as: 'activityReportObjectiveResources',
            include: [{
              model: Resource,
              as: 'resource',
            }],
          }, {
            model: ActivityReportObjectiveTopic,
            as: 'activityReportObjectiveTopics',
          },
          {
            model: ActivityReportObjectiveCourse,
            as: 'activityReportObjectiveCourses',
          },
          ],
        });
        expect(aro).toBeDefined();
        expect(aro.activityReportObjectiveFiles.length).toEqual(1);
        expect(aro.activityReportObjectiveFiles[0].fileId).toEqual(mockFiles[0].id);
        expect(aro.activityReportObjectiveResources.length).toEqual(1);
        expect(aro.activityReportObjectiveResources[0].resource.dataValues.url)
          .toEqual(mockObjectiveResources[0]);

        expect(aro.activityReportObjectiveTopics.length).toEqual(1);
        expect(aro.activityReportObjectiveCourses.length).toEqual(2);
        expect(aro.arOrder).toEqual(2);
        expect(aro.activityReportObjectiveTopics[0].topicId)
          .toEqual(mockObjectiveTopics[0].topicId);
      }
      // });
      // i t('add and remove from cache', async () => {
      {
      // update added or removed files
        await ObjectiveFile.destroy({ where: { objectiveId: objective.id } });
        await ObjectiveResource.destroy({ where: { objectiveId: objective.id } });
        await ObjectiveTopic.destroy({ where: { objectiveId: objective.id } });
        await ObjectiveCourse.destroy({ where: { courseId: courseOne.id } });
        objectiveFiles.push(await ObjectiveFile.findOrCreate({
          where: {
            objectiveId: objective.id,
            fileId: mockFiles[1].id,
          },
        }));
        objectiveResources.push(await processObjectiveForResourcesById(
          objective.id,
          [mockObjectiveResources[1]],
        ));
        objectiveTopics.push(await ObjectiveTopic.findOrCreate({
          where: { objectiveId: objective.id, ...mockObjectiveTopics[1] },
        }));

        const filesForThisObjective = await ObjectiveFile.findAll({
          where: {
            objectiveId: objective.id,
          },
        });

        const resourcesForThisObjective = await ObjectiveResource.findAll({
          where: {
            objectiveId: objective.id,
          },
        });

        const topicsForThisObjective = await ObjectiveTopic.findAll({
          where: {
            objectiveId: objective.id,
          },
        });

        const coursesForThisObjective = await ObjectiveCourse.findAll({
          where: {
            objectiveId: objective.id,
          },
        });
        // TODO: GH - fix
        const metadata = {
          files: filesForThisObjective,
          resources: [...resourcesForThisObjective, { url: '1302 Subpart A—Eligibility, Recruitment, Selection, Enrollment, and Attendance | ECLKC (hhs.gov)' }], // TODO: GH - FIX
          topics: topicsForThisObjective,
          courses: coursesForThisObjective,
          ttaProvided: null,
          order: 0,
        };
        await cacheObjectiveMetadata(objective, report.id, metadata);
        const aro = await ActivityReportObjective.findOne({
          where: { activityReportId: report.id },
          include: [{
            model: ActivityReportObjectiveFile,
            as: 'activityReportObjectiveFiles',
          }, {
            model: ActivityReportObjectiveResource,
            as: 'activityReportObjectiveResources',
            include: [{
              model: Resource,
              as: 'resource',
            }],
          }, {
            model: ActivityReportObjectiveTopic,
            as: 'activityReportObjectiveTopics',
          }, {
            model: ActivityReportObjectiveCourse,
            as: 'activityReportObjectiveCourses',
          }],
        });
        expect(aro).toBeDefined();
        expect(aro.activityReportObjectiveFiles.length).toEqual(1);
        expect(aro.activityReportObjectiveFiles[0].fileId).toEqual(mockFiles[1].id);
        expect(aro.activityReportObjectiveResources.length).toEqual(1);
        expect(aro.activityReportObjectiveResources[0].resource.dataValues.url)
          .toEqual(mockObjectiveResources[1]);
        expect(aro.activityReportObjectiveTopics.length).toEqual(1);
        expect(aro.activityReportObjectiveTopics[0].topicId)
          .toEqual(mockObjectiveTopics[1].topicId);
        expect(aro.activityReportObjectiveCourses.length).toEqual(1);
      }
      // });
      // i t('remove from cache', async () => {
      {
        const metadata = {
          files: [],
          resources: [],
          topics: [],
          ttaProvided: null,
          order: 0,
        };
        await cacheObjectiveMetadata(objective, report.id, metadata);
        const aro = await ActivityReportObjective.findOne({
          where: { activityReportId: report.id },
          include: [{
            model: ActivityReportObjectiveFile,
            as: 'activityReportObjectiveFiles',
          }, {
            model: ActivityReportObjectiveResource,
            as: 'activityReportObjectiveResources',
            include: [{
              model: Resource,
              as: 'resource',
            }],
          }, {
            model: ActivityReportObjectiveTopic,
            as: 'activityReportObjectiveTopics',
          }],
        });
        expect(aro).toBeDefined();
        expect(aro.activityReportObjectiveFiles).toEqual([]);
        expect(aro.activityReportObjectiveResources).toEqual([]);
        expect(aro.activityReportObjectiveTopics).toEqual([]);
      }
    });
  });
});
