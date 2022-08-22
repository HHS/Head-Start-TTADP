import { Op } from 'sequelize';
import {
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
  ObjectiveRole,
  ActivityReport,
  ActivityRecipient,
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveRole,
  ActivityReportObjectiveTopic,
} from '../models';
import {
  cacheObjectiveMetadata,
} from './reportCache';
import { REPORT_STATUSES } from '../constants';
import { auditLogger } from '../logger';

describe('reportCache', () => {
  const mockUser = {
    name: 'Joe Green',
    role: ['TTAC'],
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
    id: 65535,
    uei: 'NNA5N2KHMGM2',
    name: 'Tooth Brushing Academy',
    recipientType: 'Community Action Agency (CAA)',
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

  const mockGoal = {
    name: 'Goal 1',
    id: 2080,
    status: 'Not Started',
    timeframe: 'None',
  };

  const mockObjective = {
    id: 20220813,
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
    id: 140000,
    originalFileName: 'test01.pdf',
    key: '508bdc9e-8dec-4d64-b83d-59a72a4f2353.pdf',
    status: 'APPROVED',
    fileSize: 54417,
  }, {
    id: 140001,
    originalFileName: 'test02.pdf',
    key: '508bdc9e-8dec-4d64-b83d-59a72a4f2354.pdf',
    status: 'APPROVED',
    fileSize: 54417,
  }, {
    id: 140002,
    originalFileName: 'test03.pdf',
    key: '508bdc9e-8dec-4d64-b83d-59a72a4f2355.pdf',
    status: 'APPROVED',
    fileSize: 54417,
  }];

  const mockObjectiveTopics = [{
    topicId: 1,
  }, {
    topicId: 2,
  }, {
    topicId: 3,
  }];

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
  const objectiveRoles = [];
  const objectiveResources = [];
  const objectiveTopics = [];

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
    objectiveRoles.push(await ObjectiveRole.findOrCreate({
      where: {
        objectiveId: objective.id,
        roleId: roles[0].id,
      },
    }));
    objectiveTopics.push(await ObjectiveTopic.findOrCreate({
      where: { objectiveId: objective.id, ...mockObjectiveTopics[0] },
    }));
  });

  afterAll(async () => {
    await Promise.all(objectiveTopics.map(async (objectiveTopic) => objectiveTopic.destroy()));
    await Promise.all(objectiveResources.map(
      async (objectiveResource) => objectiveResource.destroy(),
    ));
    await Promise.all(objectiveRoles.map(async (objectiveRole) => objectiveRole.destroy()));
    await Promise.all(objectiveFiles.map(async (objectiveFile) => objectiveFile.destroy()));
    await Promise.all(files.map(async (file) => file.destroy()));
    await activityRecipient.destroy();
    await report.destroy();
    await grant.destroy();
    await recipient.destroy();
    await Promise.all(roles.map(async (role) => role.destroy()));
    await user.destroy();
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
          model: ActivityReportObjectiveRole,
          as: 'activityReportObjectiveRoles',
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
          model: ActivityReportObjectiveRole,
          as: 'activityReportObjectiveRoles',
        }, {
          model: ActivityReportObjectiveTopic,
          as: 'activityReportObjectiveTopics',
        }],
      });
      expect(arg).toBeDefined();
      expect(aro).toBeDefined();
      expect(aro.activityReportObjectiveFiles).toEqual([]);
      expect(aro.activityReportObjectiveResources).toEqual([]);
      expect(aro.activityReportObjectiveRoles).toEqual([]);
      expect(aro.activityReportObjectiveTopics).toEqual([]);
    });
    it('add to cache', async () => {
      await cacheObjectiveMetadata(objective, report.id, null);
      const aro = await ActivityReportObjective.findOne({
        where: { activityReportId: report.id },
        include: [{
          model: ActivityReportObjectiveFile,
          as: 'activityReportObjectiveFiles',
        }, {
          model: ActivityReportObjectiveResource,
          as: 'activityReportObjectiveResources',
        }, {
          model: ActivityReportObjectiveRole,
          as: 'activityReportObjectiveRoles',
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
      expect(aro.activityReportObjectiveRoles.length).toEqual(1);
      expect(aro.activityReportObjectiveRoles[0].roleId).toEqual(roles[0].id);
      expect(aro.activityReportObjectiveTopics.length).toEqual(1);
      expect(aro.activityReportObjectiveTopics[0].topicId).toEqual(mockObjectiveTopics[0].topicId);
    });
    it('add and remove from cache', async () => {
      await ObjectiveFile.destroy({ where: { objectiveId: objective.id } });
      await ObjectiveResource.destroy({ where: { objectiveId: objective.id } });
      await ObjectiveRole.destroy({ where: { objectiveId: objective.id } });
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
      objectiveRoles.push(await ObjectiveRole.findOrCreate({
        where: {
          objectiveId: objective.id,
          roleId: roles[1].id,
        },
      }));
      objectiveTopics.push(await ObjectiveTopic.findOrCreate({
        where: { objectiveId: objective.id, ...mockObjectiveTopics[1] },
      }));
      await cacheObjectiveMetadata(objective, report.id, null);
      const aro = await ActivityReportObjective.findOne({
        where: { activityReportId: report.id },
        include: [{
          model: ActivityReportObjectiveFile,
          as: 'activityReportObjectiveFiles',
        }, {
          model: ActivityReportObjectiveResource,
          as: 'activityReportObjectiveResources',
        }, {
          model: ActivityReportObjectiveRole,
          as: 'activityReportObjectiveRoles',
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
      expect(aro.activityReportObjectiveRoles.length).toEqual(1);
      expect(aro.activityReportObjectiveRoles[0].roleId).toEqual(roles[1].id);
      expect(aro.activityReportObjectiveTopics.length).toEqual(1);
      expect(aro.activityReportObjectiveTopics[0].topicId).toEqual(mockObjectiveTopics[1].topicId);
    });
    it('remove from cache', async () => {
      await ObjectiveFile.destroy({ where: { objectiveId: objective.id } });
      await ObjectiveResource.destroy({ where: { objectiveId: objective.id } });
      await ObjectiveRole.destroy({ where: { objectiveId: objective.id } });
      await ObjectiveTopic.destroy({ where: { objectiveId: objective.id } });
      await cacheObjectiveMetadata(objective, report.id, null);
      const aro = await ActivityReportObjective.findOne({
        where: { activityReportId: report.id },
        include: [{
          model: ActivityReportObjectiveFile,
          as: 'activityReportObjectiveFiles',
        }, {
          model: ActivityReportObjectiveResource,
          as: 'activityReportObjectiveResources',
        }, {
          model: ActivityReportObjectiveRole,
          as: 'activityReportObjectiveRoles',
        }, {
          model: ActivityReportObjectiveTopic,
          as: 'activityReportObjectiveTopics',
        }],
      });
      expect(aro).toBeDefined();
      expect(aro.activityReportObjectiveFiles).toEqual([]);
      expect(aro.activityReportObjectiveResources).toEqual([]);
      expect(aro.activityReportObjectiveRoles).toEqual([]);
      expect(aro.activityReportObjectiveTopics).toEqual([]);
    });
  });
});
