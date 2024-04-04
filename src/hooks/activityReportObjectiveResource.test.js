import { faker } from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import {
  sequelize,
  ActivityReport,
  Objective,
  ActivityReportObjective,
  ActivityReportObjectiveResource,
  User,
  Resource,
} from '../models';

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
  version: 2,
};

describe('activityReportObjectiveResource hooks', () => {
  let mockUser;
  let arToDestroy;
  let objectiveToDestroy;
  let activityReportObjectiveToDestroy;
  let activityReportObjectiveResourceToDestroy;
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
      lastLogin: new Date(),
    });

    arToDestroy = await ActivityReport.create({ ...draftObject, userId: mockUser.id });

    objectiveToDestroy = await Objective.create({
      name: 'Activity Report Objective Resource',
      status: 'Draft',
      endDate: null,
      isFromSmartsheetTtaPlan: false,
      onApprovedAR: false,
      grantId: 1,
      createdVia: 'rtr',
    });

    activityReportObjectiveToDestroy = await ActivityReportObjective.create({
      objectiveId: objectiveToDestroy.id,
      activityReportId: arToDestroy.id,
    });

    resourceToDestroy = await Resource.create({ url: destroyUrl });

    activityReportObjectiveResourceToDestroy = await ActivityReportObjectiveResource.create({
      activityReportObjectiveId: activityReportObjectiveToDestroy.id,
      resourceId: resourceToDestroy.id,
      sourceFields: ['resource'],
    });
  });

  afterEach(async () => {
    await ActivityReportObjectiveResource.destroy({
      where: { activityReportObjectiveId: activityReportObjectiveToDestroy.id },
      individualHooks: true,
    });

    await ActivityReportObjective.destroy({
      where: { objectiveId: objectiveToDestroy.id },
      individualHooks: true,
    });

    await Objective.destroy({
      where: { id: objectiveToDestroy.id },
      individualHooks: true,
      force: true,
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
      let aror = await ActivityReportObjectiveResource.findOne({
        where: { activityReportObjectiveId: activityReportObjectiveToDestroy.id },
      });
      expect(aror).not.toBeNull();

      let resource = await Resource.findOne({
        where: { id: resourceToDestroy.id },
      });
      expect(resource).not.toBeNull();

      // Destroy.
      await ActivityReportObjectiveResource.destroy({
        where: { activityReportObjectiveId: activityReportObjectiveToDestroy.id },
        individualHooks: true,
      });

      aror = await ActivityReportObjectiveResource.findOne({
        where: { activityReportObjectiveId: activityReportObjectiveToDestroy.id },
      });
      expect(aror).toBeNull();

      resource = await Resource.findOne({
        where: { id: resourceToDestroy.id },
      });
      expect(resource).toBeNull();
    });
  });
});
