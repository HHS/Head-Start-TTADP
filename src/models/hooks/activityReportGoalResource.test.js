import { faker } from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import {
  sequelize,
  ActivityReport,
  Goal,
  ActivityReportGoal,
  ActivityReportGoalResource,
  User,
  Resource,
} from '..';

const draftObject = {
  activityRecipientType: 'recipient',
  regionId: 6,
  activityRecipients: [{ grantId: 1 }],
  submissionStatus: REPORT_STATUSES.DRAFT,
  calculatedStatus: REPORT_STATUSES.DRAFT,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
  creatorRole: 'TTAC',
};

jest.mock('bull');

describe('activityReportGoalResource hooks', () => {
  let mockUser;
  let arToDestroy;
  let goalToDestroy;
  let activityReportGoalToDestroy;
  let activityReportGoalResourceToDestroy;
  let resourceToDestroy;
  const destroyUrl = faker.internet.url();

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    mockUser = await User.create({
      id: faker.datatype.number(),
      homeRegionId: 1,
      hsesUsername: faker.datatype.string(),
      hsesUserId: faker.datatype.string(),
    });

    arToDestroy = await ActivityReport.create({ ...draftObject, userId: mockUser.id });

    goalToDestroy = await Goal.create({
      name: 'Activity Report Goal Resource',
      status: 'Draft',
      endDate: null,
      isFromSmartsheetTtaPlan: false,
      onApprovedAR: false,
      grantId: 1,
      createdVia: 'rtr',
    });

    activityReportGoalToDestroy = await ActivityReportGoal.create({
      goalId: goalToDestroy.id,
      activityReportId: arToDestroy.id,
    });

    resourceToDestroy = await Resource.create({ url: destroyUrl });

    activityReportGoalResourceToDestroy = await ActivityReportGoalResource.create({
      activityReportGoalId: activityReportGoalToDestroy.id,
      resourceId: resourceToDestroy.id,
      sourceFields: ['resource'],
    });
  });

  afterEach(async () => {
    await ActivityReportGoalResource.destroy({
      where: { activityReportGoalId: activityReportGoalToDestroy.id },
      individualHooks: true,
    });

    await ActivityReportGoal.destroy({
      where: { goalId: goalToDestroy.id },
      individualHooks: true,
    });

    await Goal.destroy({
      where: { id: goalToDestroy.id },
      individualHooks: true,
    });

    await Resource.destroy({
      where: { url: destroyUrl },
      individualHooks: true,
    });

    await ActivityReport.destroy({ where: { id: arToDestroy.id } });

    await User.destroy({
      where: {
        id: mockUser.id,
      },
    });
    await sequelize.close();
  });
  describe('afterDestroy', () => {
    it('clean up orphan resources', async () => {
      let argr = await ActivityReportGoalResource.findOne({
        where: { activityReportGoalId: activityReportGoalToDestroy.id },
      });
      expect(argr).not.toBeNull();

      let resource = await Resource.findOne({
        where: { id: resourceToDestroy.id },
      });
      expect(resource).not.toBeNull();

      // Destroy.
      await ActivityReportGoalResource.destroy({
        where: { activityReportGoalId: activityReportGoalToDestroy.id },
        individualHooks: true,
      });

      argr = await ActivityReportGoalResource.findOne({
        where: { activityReportGoalId: activityReportGoalToDestroy.id },
      });
      expect(argr).toBeNull();

      resource = await Resource.findOne({
        where: { id: resourceToDestroy.id },
      });
      expect(resource).toBeNull();
    });
  });
});
