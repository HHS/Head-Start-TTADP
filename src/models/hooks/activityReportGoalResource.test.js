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
import { recalculateOnAR } from './activityReportGoalResource';

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

jest.mock('bull');

describe('activityReportGoalResource hooks', () => {
  let mockUser;
  let arToDestroy;
  let goalToDestroy;
  let activityReportGoalToDestroy;
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

    goalToDestroy = await Goal.create({
      name: 'Activity Report Goal Resource',
      status: 'Draft',
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

    await ActivityReportGoalResource.create({
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

    jest.clearAllMocks();
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

  describe('activityReportGoalResource hook', () => {
    afterEach(() => jest.clearAllMocks());
    describe('recalculateOnAR', () => {
      const mockSequelize = {
        query: jest.fn(),
      };
      const mockInstance = {
        activityReportGoalId: 1,
        resourceId: 1,
      };
      it('recalculates when goalIds are in the metadata', async () => {
        const mockOptions = {
          hookMetadata: {
            goalIds: [1],
          },
          transaction: {},
        };
        await recalculateOnAR(mockSequelize, mockInstance, mockOptions);
        const resourceOnReport = `
        SELECT
          r."id",
          COUNT(aror.id) > 0 "onAR"
        FROM "GoalResources" r
        LEFT JOIN "ActivityReportGoals" aro
        ON r."goalId" = aro."goalId"
        JOIN "ActivityReportGoalResources" aror
        ON aro.id = aror."activityReportGoalId"
        AND r."resourceId" = aror."resourceId"
        WHERE r."goalId" IN (${mockOptions.hookMetadata.goalIds.join(',')})
        AND r."resourceId" = ${mockInstance.resourceId}
        AND aro.id != ${mockInstance.activityReportGoalId}
        GROUP BY r."id"`;
        // get the first call and replace all whitespace
        const call = mockSequelize.query.mock.calls[0][0].trim().replace(/\s+/g, ' ');
        const expected = `WITH
          "ResourceOnReport" AS (${resourceOnReport})
        UPDATE "GoalResources" r
        SET "onAR" = rr."onAR"
        FROM "ResourceOnReport" rr
        WHERE r.id = rr.id;`.trim();
        expect(call).toEqual((expected.replace(/\s+/g, ' ')));
      });
      it('recalculates when goalIds are not in the metadata', async () => {
        const mockOptions = {
          hookMetadata: {},
          transaction: {},
        };
        await recalculateOnAR(mockSequelize, mockInstance, mockOptions);
        const resourceOnReport = `
          SELECT
            r."id",
            COUNT(aror.id) > 0 "onAR"
          FROM "GoalResources" r
          JOIN "ActivityReportGoals" arox
          ON r."goalId" = arox."goalId"
          LEFT JOIN "ActivityReportGoals" aro
          ON r."goalId" = aro."goalId"
          JOIN "ActivityReportGoalResources" aror
          ON aro.id = aror."activityReportGoalId"
          AND r."resourceId" = aror."resourceId"
          WHERE arox.id = ${mockInstance.activityReportGoalId}
          AND r."resourceId" = ${mockInstance.resourceId}
          AND aro.id != ${mockInstance.activityReportGoalId}
          GROUP BY r."id"`;
        // get the first call and replace all whitespace
        const call = mockSequelize.query.mock.calls[0][0].trim().replace(/\s+/g, ' ');
        const expected = `WITH
          "ResourceOnReport" AS (${resourceOnReport})
        UPDATE "GoalResources" r
        SET "onAR" = rr."onAR"
        FROM "ResourceOnReport" rr
        WHERE r.id = rr.id;`.trim();
        expect(call).toEqual((expected.replace(/\s+/g, ' ')));
      });
    });
  });
});
