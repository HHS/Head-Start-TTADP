import { readFileSync } from 'fs';
import importGoals from './importPlanGoals';
import { downloadFile } from '../lib/s3';
import db, {
  Goal, Grant,
} from '../models';
import { logger } from '../logger';

jest.mock('../logger');

jest.mock('../lib/s3');

describe('Import TTA plan goals', () => {
  beforeEach(async () => {
    downloadFile.mockReset();
  });
  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('for a single region', () => {
    const regionId = 14;

    beforeAll(async () => {
      try {
        const fileName = 'GranteeTTAPlanTest.csv';
        downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });
        const goals = await Goal.findAll({
          include: [
            {
              model: Grant,
              as: 'grant',
              where: {
                regionId,
              },
              required: true,
            },
          ],
        });
        await Goal.destroy({
          where: {
            id: goals.map((goal) => goal.id),
          },
        });
        await importGoals(fileName, regionId);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(`Unable to setup Import Plan Goals test ${error}`);
      }
    });

    it('should import Goals table', async () => {
      const allGoals = await Goal.findAll({
        include: [
          {
            model: Grant,
            as: 'grant',
            where: {
              regionId,
            },
            required: true,
          },
        ],
      });
      expect(allGoals).toBeDefined();
      expect(allGoals.length).toBe(16);

      // test eager loading
      const goal = await Goal.findOne({
        where: { name: 'Expand children\'s experiences with high quality early learning to prepare them for Kindergarten' },
        attributes: ['name', 'status', 'timeframe', 'isFromSmartsheetTtaPlan'],
        include: [{
          model: Grant,
          as: 'grant',
          attributes: ['id', 'number', 'regionId'],
          where: {
            number: '14CH00002',
            regionId,
          },
          required: true,
        }],
      });
      expect(goal.name).toBe('Expand children\'s experiences with high quality early learning to prepare them for Kindergarten');
      expect(goal.status).toBe('Not Started');
      expect(goal.timeframe).toBe('Dates to be determined by October 30, 2020');
      expect(goal.isFromSmartsheetTtaPlan).toBe(true);
      expect(goal.grant).toEqual(
        expect.objectContaining({
          id: expect.anything(), number: '14CH00002', recipient: expect.anything(), regionId,
        }),
      );
    });

    it('should update status if it is newer', async () => {
      const fileName = 'GranteeTTAPlanTest.csv';
      downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });

      const goalInProgress = await Goal.findOne({
        where: { status: 'In Progress' },
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId,
          },
          required: true,
        }],
      });
      await goalInProgress.update({
        status: 'Not Started',
      });
      const goalNotStarted = await Goal.findOne({
        where: { id: goalInProgress.id },
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId,
          },
          required: true,
        }],
      });
      expect(goalNotStarted.status).toBe('Not Started');

      await importGoals(fileName, regionId);

      const updatedGoal = await Goal.findOne({
        where: { id: goalInProgress.id },
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId,
          },
          required: true,
        }],
      });
      expect(updatedGoal.status).toBe('In Progress');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(`Updating goal ${goalInProgress.id}: Changing status from Not Started to In Progress`),
      );
    });

    it('should not update status if it is older', async () => {
      const fileName = 'GranteeTTAPlanTest.csv';
      downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });
      // Find a goal that was imported as 'Not Started', change to 'Suspended' and update
      const goalNotStarted = await Goal.findOne({
        where: { status: 'Not Started' },
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId,
          },
          required: true,
        }],
      });
      await goalNotStarted.update({
        status: 'Suspended',
      });
      const goalSuspended = await Goal.findOne({
        where: { id: goalNotStarted.id },
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId,
          },
          required: true,
        }],
      });
      expect(goalSuspended.status).toBe('Suspended');

      await importGoals(fileName, regionId);

      const updatedGoal = await Goal.findOne({
        where: { id: goalNotStarted.id },
      });
      expect(updatedGoal.status).toBe('Suspended');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(`Skipping goal status update for ${goalNotStarted.id}: goal status Suspended is newer or equal to Not Started`),
      );
    });

    it('should update timeframe', async () => {
      const fileName = 'GranteeTTAPlanTest.csv';
      downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });
      // Find a goal that was imported, change the timeframe and update by running the import script
      const goalWithTimeframe = await Goal.findOne({
        where: { timeframe: '6 months' },
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId,
          },
          required: true,
        }],
      });
      expect(goalWithTimeframe.timeframe).toBe('6 months');

      await goalWithTimeframe.update({
        timeframe: '12 months',
      });
      const modifiedGoal = await Goal.findOne({
        where: { id: goalWithTimeframe.id },
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId,
          },
          required: true,
        }],
      });
      expect(modifiedGoal.timeframe).toBe('12 months');

      await importGoals(fileName, regionId);

      const updatedGoal = await Goal.findOne({
        where: { id: goalWithTimeframe.id },
      });
      expect(updatedGoal.timeframe).toBe('6 months');
    });

    it('should set createdVia when creating a new goal', async () => {
      const fileName = 'GranteeTTAPlanTest.csv';
      downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });

      const aGoal = await Goal.findOne({
        where: { createdVia: 'imported' },
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId,
          },
          required: true,
        }],
      });

      await aGoal.update({
        createdVia: null,
      });

      const goalWithoutCreatedVia = await Goal.findOne({
        where: { createdVia: null },
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId,
          },
          required: true,
        }],
      });
      expect(goalWithoutCreatedVia.createdVia).toBeNull();
      // Delete a goal and re-import
      await Goal.destroy({
        where: {
          name: goalWithoutCreatedVia.name,
          grantId: goalWithoutCreatedVia.grantId,
        },
      });

      await importGoals(fileName, regionId);

      const importedGoal = await Goal.findOne({
        where: { name: goalWithoutCreatedVia.name, grantId: goalWithoutCreatedVia.grantId },
      });
      expect(importedGoal.createdVia).toBe('imported');
    });

    it('should not set createdVia when updating an existing goal', async () => {
      const fileName = 'GranteeTTAPlanTest.csv';
      downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });

      const aGoal = await Goal.findOne({
        where: { createdVia: 'imported' },
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId,
          },
          required: true,
        }],
      });

      await aGoal.update({
        createdVia: 'rtr',
      });

      const goalWithRTRCreatedVia = await Goal.findOne({
        where: { name: aGoal.name, grantId: aGoal.grantId },
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId,
          },
          required: true,
        }],
      });
      expect(goalWithRTRCreatedVia.createdVia).toBe('rtr');

      await importGoals(fileName, regionId);

      const importedGoal = await Goal.findOne({
        where: { name: goalWithRTRCreatedVia.name, grantId: goalWithRTRCreatedVia.grantId },
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId,
          },
          required: true,
        }],
      });
      expect(importedGoal.createdVia).toBe('rtr');
    });

    it('should set isRttapa when creating a new goal', async () => {
      const fileName = 'GranteeTTAPlanTest.csv';
      downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });

      const aGoal = await Goal.findOne({
        where: { isRttapa: 'Yes' },
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId,
          },
          required: true,
        }],
      });

      // Delete aGoal and re-import
      await Goal.destroy({
        where: {
          name: aGoal.name,
          grantId: aGoal.grantId,
        },
      });

      await importGoals(fileName, regionId);

      const importedGoal = await Goal.findOne({
        where: { name: aGoal.name, grantId: aGoal.grantId },
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId,
          },
          required: true,
        }],
      });
      expect(importedGoal.isRttapa).toBe('Yes');
    });

    it('should set isRttapa when updating goal', async () => {
      const fileName = 'GranteeTTAPlanTest.csv';
      downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });

      const aGoal = await Goal.findOne({
        where: { isRttapa: 'Yes' },
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId,
          },
          required: true,
        }],
      });

      await aGoal.update({
        isRttapa: 'No',
      });

      const goalNotRttapa = await Goal.findOne({
        where: { isRttapa: 'No' },
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId,
          },
          required: true,
        }],
      });

      await importGoals(fileName, regionId);

      const importedGoal = await Goal.findOne({
        where: { name: goalNotRttapa.name, grantId: goalNotRttapa.grantId },
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId,
          },
          required: true,
        }],
      });
      expect(importedGoal.isRttapa).toBe('Yes');
    });

    it('is idempotent', async () => {
      const fileName = 'GranteeTTAPlanTest.csv';
      downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });

      const allGoals = await Goal.findAll({
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId,
          },
          required: true,
        }],
      });
      expect(allGoals).toBeDefined();

      await importGoals(fileName, regionId);

      const allGoals2 = await Goal.findAll({
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId,
          },
          required: true,
        }],
      });
      expect(allGoals2).toBeDefined();
      expect(allGoals2.length).toBe(allGoals.length);
    });

    it('should import goals from another region', async () => {
      const fileName = 'R9GranteeTTAPlanTest.csv';
      downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });

      await importGoals(fileName, 9);

      const allGoals = await Goal.findAll({
        include: [{
          model: Grant,
          as: 'grant',
          where: {
            regionId: 9,
          },
          required: true,
        }],
      });
      expect(allGoals).toBeDefined();
      expect(allGoals.length).toBe(1);

      // test eager loading
      const goal = await Goal.findOne({
        where: { name: 'Demonstrate an understanding of Fiscal requirements for non-federal share.' },
        attributes: ['name', 'status', 'timeframe', 'isFromSmartsheetTtaPlan'],
        include: [{
          model: Grant,
          as: 'grant',
          attributes: ['id', 'number', 'regionId'],
          where: {
            regionId: 9,
          },
        }],
      });
      expect(goal.name).toBe('Demonstrate an understanding of Fiscal requirements for non-federal share.');
      expect(goal.status).toBe('Not Started');
      expect(goal.timeframe).toBe('One month');
      expect(goal.isFromSmartsheetTtaPlan).toBe(true);

      expect(goal.grant.number).toBe('09HP044444');
      expect(goal.grant.regionId).toBe(9);
    });
  });
});
