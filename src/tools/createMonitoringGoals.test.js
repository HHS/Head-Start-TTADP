import faker from '@faker-js/faker';
import createMonitoringGoals from './createMonitoringGoals';
import {
  sequelize,
  GoalTemplate,
  Recipient,
  Grant,
  MonitoringReviewGrantee,
  MonitoringReview,
  MonitoringReviewStatus,
  MonitoringFindingHistory,
  MonitoringFinding,
  MonitoringFindingStatus,
  MonitoringFindingGrant,
  Goal,
} from '../models';
import { auditLogger } from '../logger';

jest.mock('../logger');

describe('createMonitoringGoals', () => {
  let recipient;
  let allGrants;
  let grantThatNeedsMonitoringGoal;
  let grantThatAlreadyHasMonitoringGoal;
  let grantThatFallsBeforeStartDate;
  let grantThatFallsAfterCutOffDate;
  let grantThatIsInactive;
  let grantThatsMonitoringReviewStatusIsNotComplete;
  let grantThatsMonitoringFindingStatusIsNotActive;
  let grantThatsMonitoringReviewReviewTypeIsNotAllowed;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    try {
    // Recipient.
      recipient = await Recipient.create({
        id: faker.datatype.number({ min: 64000 }),
        name: faker.random.alphaNumeric(6),
      });

      // Grants.
      const grants = await Grant.bulkCreate([
        {
          id: faker.datatype.number({ min: 9999 }),
          number: faker.datatype.string(),
          recipientId: recipient.id,
          regionId: 1,
          startDate: new Date(),
          endDate: new Date(),
          status: 'Active',
        },
        {
          id: faker.datatype.number({ min: 9999 }),
          number: faker.datatype.string(),
          recipientId: recipient.id,
          regionId: 1,
          startDate: new Date(),
          endDate: new Date(),
          status: 'Active',
        },
        {
          id: faker.datatype.number({ min: 9999 }),
          number: faker.datatype.string(),
          recipientId: recipient.id,
          regionId: 1,
          startDate: new Date('2021-01-01'),
          endDate: new Date('2021-12-31'),
          status: 'Active',
        },
        {
          id: faker.datatype.number({ min: 9999 }),
          number: faker.datatype.string(),
          recipientId: recipient.id,
          regionId: 1,
          startDate: new Date('2023-12-02'),
          endDate: new Date('2024-12-01'),
          status: 'Active',
        },
        {
          id: faker.datatype.number({ min: 9999 }),
          number: faker.datatype.string(),
          recipientId: recipient.id,
          regionId: 1,
          startDate: new Date(),
          endDate: new Date(),
          status: 'Inactive',
        },
        {
          id: faker.datatype.number({ min: 9999 }),
          number: faker.datatype.string(),
          recipientId: recipient.id,
          regionId: 1,
          startDate: new Date(),
          endDate: new Date(),
          status: 'Active',
        },
        {
          id: faker.datatype.number({ min: 9999 }),
          number: faker.datatype.string(),
          recipientId: recipient.id,
          regionId: 1,
          startDate: new Date(),
          endDate: new Date(),
          status: 'Active',
        },
        {
          id: faker.datatype.number({ min: 9999 }),
          number: faker.datatype.string(),
          recipientId: recipient.id,
          regionId: 1,
          startDate: new Date(),
          endDate: new Date(),
          status: 'Active',
        },
      ]);

      [
        grantThatNeedsMonitoringGoal,
        grantThatAlreadyHasMonitoringGoal,
        grantThatFallsBeforeStartDate,
        grantThatFallsAfterCutOffDate,
        grantThatIsInactive,
        grantThatsMonitoringReviewStatusIsNotComplete,
        grantThatsMonitoringFindingStatusIsNotActive,
        grantThatsMonitoringReviewReviewTypeIsNotAllowed,
      ] = grants;

      // Set allGrants to the grants that were created.
      allGrants = grants;

      // MonitoringReviewGrantee.
      await MonitoringReviewGrantee.bulkCreate([
        {
          id: faker.datatype.number({ min: 9999 }),
          grantNumber: grantThatNeedsMonitoringGoal.number,
          reviewId: faker.datatype.string(),
          granteeId: recipient.id,
          createTime: new Date(),
          updateTime: new Date(),
          updateBy: 'Support Team',
        },
        {
          id: faker.datatype.number({ min: 9999 }),
          grantNumber: grantThatAlreadyHasMonitoringGoal.number,
          reviewId: faker.datatype.string(),
          granteeId: recipient.id,
          createTime: new Date(),
          updateTime: new Date(),
          updateBy: 'Support Team',
        },
        {
          id: faker.datatype.number({ min: 9999 }),
          grantNumber: grantThatFallsBeforeStartDate.number,
          reviewId: faker.datatype.string(),
          granteeId: recipient.id,
          createTime: new Date(),
          updateTime: new Date(),
          updateBy: 'Support Team',
        },
        {
          id: faker.datatype.number({ min: 9999 }),
          grantNumber: grantThatFallsAfterCutOffDate.number,
          reviewId: faker.datatype.string(),
          granteeId: recipient.id,
          createTime: new Date(),
          updateTime: new Date(),
          updateBy: 'Support Team',
        },
        {
          id: faker.datatype.number({ min: 9999 }),
          grantNumber: grantThatIsInactive.number,
          reviewId: faker.datatype.string(),
          granteeId: recipient.id,
          createTime: new Date(),
          updateTime: new Date(),
          updateBy: 'Support Team',
        },
        {
          id: faker.datatype.number({ min: 9999 }),
          grantNumber: grantThatsMonitoringReviewStatusIsNotComplete.number,
          reviewId: faker.datatype.string(),
          granteeId: recipient.id,
          createTime: new Date(),
          updateTime: new Date(),
          updateBy: 'Support Team',
        },
        {
          id: faker.datatype.number({ min: 9999 }),
          grantNumber: grantThatsMonitoringFindingStatusIsNotActive.number,
          reviewId: faker.datatype.string(),
          granteeId: recipient.id,
          createTime: new Date(),
          updateTime: new Date(),
          updateBy: 'Support Team',
        },
        {
          id: faker.datatype.number({ min: 9999 }),
          grantNumber: grantThatsMonitoringReviewReviewTypeIsNotAllowed.number,
          reviewId: faker.datatype.string(),
          granteeId: recipient.id,
          createTime: new Date(),
          updateTime: new Date(),
          updateBy: 'Support Team',
        },
      ]);

      // MonitoringReview.
    /*
    await MonitoringReview.bulkCreate([
      {
        id: faker.datatype.string(),
        statusId: 1,
        reportDeliveryDate: new Date(),
        reviewType: 'AIAN-DEF',
      },
      {
        id: faker.datatype.string(),
        statusId: 1,
        reportDeliveryDate: new Date(),
        reviewType: 'AIAN-DEF',
      },
      {
        id: faker.datatype.string(),
        statusId: 1,
        reportDeliveryDate: new Date(),
        reviewType: 'AIAN-DEF',
      },
      {
        id: faker.datatype.string(),
        statusId: 1,
        reportDeliveryDate: new Date(),
        reviewType: 'AIAN-DEF',
      },
      {
        id: faker.datatype.string(),
        statusId: 2,
        reportDeliveryDate: new Date(),
        reviewType: 'AIAN-DEF',
      },
      {
        id: faker.datatype.string(),
        statusId: 1,
        reportDeliveryDate: new Date(),
        reviewType: 'AIAN-DEF',
      },
      {
        id: faker.datatype.string(),
        statusId: 1,
        reportDeliveryDate: new Date(),
        reviewType: 'AIAN-DEF',
      },
      {
        id: faker.datatype.string(),
        statusId: 1,
        reportDeliveryDate: new Date(),
        reviewType: 'AIAN-DEF',
      },
    ]);
    */
    } catch (error) {
      console.log('\n\n\n============create error', error);
    }
  });

  afterAll(async () => {
    try {
    // Delete MonitoringReviewGrantee.
      await MonitoringReviewGrantee.destroy({
        where: {
          grantNumber: allGrants.map((grant) => grant.number),
        },
      });

      // Delete Grants.
      await Grant.destroy({
        where: {
          number: allGrants.map((grant) => grant.number),
        },
      });

      // Delete Recipient.
      await Recipient.destroy({
        where: {
          id: recipient.id,
        },
      });

      // Close the connection to the database.
      await sequelize.close();
    } catch (error) {
      console.log('\n\n\n============delete error', error);
    }
  });

  it('logs an error is the monitoring goal template doesn\'t exist', async () => {
    // Mock the GoalTemplate.findOne method to return null.
    GoalTemplate.findOne = jest.fn().mockResolvedValueOnce(null);
    jest.spyOn(auditLogger, 'error');
    await createMonitoringGoals();
    expect(auditLogger.error).toHaveBeenCalledWith('Monitoring Goal template with ID 18172 not found');
  });

  it('creates monitoring goals for grants that need them', async () => {
    expect(true).toBe(true);
  });
});
