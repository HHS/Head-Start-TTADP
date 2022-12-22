import { Op } from 'sequelize';
import { REPORT_STATUSES } from '@ttahub/common';
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
  CollaboratorRole,
  Topic,
} from '../models';
import {
  cacheObjectiveMetadata,
} from './reportCache';

describe('reportCache', () => {
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
  };

  const mockObjective = {
    id: 2022081300,
    title: null,
    status: 'Not Started',
  };

  const mockReport = {
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
  }, {
    id: 140000003,
    originalFileName: 'test03.pdf',
    key: '508bdc9e-8dec-4d64-b83d-59a72a4f2355.pdf',
    status: 'APPROVED',
    fileSize: 54417,
  }];

  let mockObjectiveTopics;

  const mockObjectiveResources = [{
    userProvidedUrl: 'https://ttahub.ohs.acf.hhs.gov/',
  }, {
    userProvidedUrl: 'https://hses.ohs.acf.hhs.gov/',
  }, {
    userProvidedUrl: 'https://eclkc.ohs.acf.hhs.gov/',
  }];

  let user;
  const roles = [];
  let recipient;
  let grant;
  let report;
  let activityRecipient;
  let goal;
  let objective;
  let files = [];
  const objectiveFiles = [];
  const objectiveResources = [];
  const objectiveTopics = [];
  const topics = [];

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
    [activityRecipient] = await ActivityRecipient.findOrCreate({
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
    files = await File.findAll({ where: { id: mockFiles.map((mockFile) => mockFile.id) } });
    objectiveFiles.push(await ObjectiveFile.findOrCreate({
      where: {
        objectiveId: objective.id,
        fileId: files[0].id,
      },
    }));
    objectiveResources.push(await ObjectiveResource.findOrCreate({
      where: { objectiveId: objective.id, ...mockObjectiveResources[0] },
    }));
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
    await Promise.all(files.map(async (file) => file.destroy()));
    await activityRecipient.destroy();
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
    await ActivityReportObjective.destroy({ where: { objectiveId: objective.id } });
    await ActivityReport.destroy({ where: { id: report.id } });
    await Objective.destroy({ where: { id: objective.id } });
    await Goal.destroy({ where: { id: goal.id } });
    await Grant.destroy({ where: { id: grant.id } });
    await Recipient.destroy({ where: { id: recipient.id } });
    await Promise.all(roles.map(async (role) => CollaboratorRole.destroy({
      where: { roleId: role.id },
    })));
    await Promise.all(roles.map(async (role) => role.destroy()));
    await User.destroy({ where: { id: user.id } });
    await db.sequelize.close();
  });

  describe('cache', () => {
    it('null', async () => {
      const arg = await ActivityReportGoal.findOne({ where: { activityReportId: report.id } });
      const aro = await ActivityReportObjective.findOne({
        where: { activityReportId: report.id },
        include: [{
          model: ActivityReportObjectiveFile,
          as: 'activityReportObjectiveFiles',
        }, {
          model: ActivityReportObjectiveResource,
          as: 'activityReportObjectiveResources',
        }, {
          model: ActivityReportObjectiveTopic,
          as: 'activityReportObjectiveTopics',
        }],
      });

      expect(arg).toBeNull();
      expect(aro).toBeNull();
    });
    it('initial set', async () => {
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
        }, {
          model: ActivityReportObjectiveTopic,
          as: 'activityReportObjectiveTopics',
        }],
      });
      expect(arg).toBeDefined();
      expect(aro).toBeDefined();
      expect(aro.activityReportObjectiveFiles).toEqual([]);
      expect(aro.activityReportObjectiveResources).toEqual([]);
      expect(aro.activityReportObjectiveTopics).toEqual([]);
    });
    it('add to cache', async () => {
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

      const metadata = {
        files: filesForThisObjective,
        resources,
        topics: topicsForThisObjective,
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
        }, {
          model: ActivityReportObjectiveTopic,
          as: 'activityReportObjectiveTopics',
        }],
      });
      expect(aro).toBeDefined();
      expect(aro.activityReportObjectiveFiles.length).toEqual(1);
      expect(aro.activityReportObjectiveFiles[0].fileId).toEqual(mockFiles[0].id);
      expect(aro.activityReportObjectiveResources.length).toEqual(1);
      expect(aro.activityReportObjectiveResources[0].userProvidedUrl)
        .toEqual(mockObjectiveResources[0].userProvidedUrl);

      expect(aro.activityReportObjectiveTopics.length).toEqual(1);
      expect(aro.arOrder).toEqual(2);
      expect(aro.activityReportObjectiveTopics[0].topicId).toEqual(mockObjectiveTopics[0].topicId);
    });
    it('add and remove from cache', async () => {
      // update added or removed files
      await ObjectiveFile.destroy({ where: { objectiveId: objective.id } });
      await ObjectiveResource.destroy({ where: { objectiveId: objective.id } });
      await ObjectiveTopic.destroy({ where: { objectiveId: objective.id } });
      objectiveFiles.push(await ObjectiveFile.findOrCreate({
        where: {
          objectiveId: objective.id,
          fileId: mockFiles[1].id,
        },
      }));
      objectiveResources.push(await ObjectiveResource.findOrCreate({
        where: { objectiveId: objective.id, ...mockObjectiveResources[1] },
      }));
      objectiveTopics.push(await ObjectiveTopic.findOrCreate({
        where: { objectiveId: objective.id, ...mockObjectiveTopics[1] },
      }));

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

      const metadata = {
        files: filesForThisObjective,
        resources: [...resources, { userProvidedUrl: '1302 Subpart A—Eligibility, Recruitment, Selection, Enrollment, and Attendance | ECLKC (hhs.gov)' }],
        topics: topicsForThisObjective,
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
        }, {
          model: ActivityReportObjectiveTopic,
          as: 'activityReportObjectiveTopics',
        }],
      });
      expect(aro).toBeDefined();
      expect(aro.activityReportObjectiveFiles.length).toEqual(1);
      expect(aro.activityReportObjectiveFiles[0].fileId).toEqual(mockFiles[1].id);
      expect(aro.activityReportObjectiveResources.length).toEqual(1);
      expect(aro.activityReportObjectiveResources[0].userProvidedUrl)
        .toEqual(mockObjectiveResources[1].userProvidedUrl);
      expect(aro.activityReportObjectiveTopics.length).toEqual(1);
      expect(aro.activityReportObjectiveTopics[0].topicId).toEqual(mockObjectiveTopics[1].topicId);
    });
    it('remove from cache', async () => {
      await ObjectiveFile.destroy({ where: { objectiveId: objective.id } });
      await ObjectiveResource.destroy({ where: { objectiveId: objective.id } });
      await ObjectiveTopic.destroy({ where: { objectiveId: objective.id } });

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

      const metadata = {
        files: filesForThisObjective,
        resources,
        topics: topicsForThisObjective,
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
        }, {
          model: ActivityReportObjectiveTopic,
          as: 'activityReportObjectiveTopics',
        }],
      });
      expect(aro).toBeDefined();
      expect(aro.activityReportObjectiveFiles).toEqual([]);
      expect(aro.activityReportObjectiveResources).toEqual([]);
      expect(aro.activityReportObjectiveTopics).toEqual([]);
    });
  });
});
