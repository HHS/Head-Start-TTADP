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
    beforeAll(async () => {
      try {
        const fileName = 'GranteeTTAPlanTest.csv';
        downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });
        await Goal.destroy({ where: {} });
        await importGoals(fileName, 14);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(`Unable to setup Import Plan Goals test ${error}`);
      }
    });

    it('should import Goals table', async () => {
      const allGoals = await Goal.findAll();
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
          },
        }],
      });
      expect(goal.name).toBe('Expand children\'s experiences with high quality early learning to prepare them for Kindergarten');
      expect(goal.status).toBe('Not Started');
      expect(goal.timeframe).toBe('Dates to be determined by October 30, 2020');
      expect(goal.isFromSmartsheetTtaPlan).toBe(true);
      expect(goal.grant).toEqual(
        expect.objectContaining({
          id: expect.anything(), number: '14CH00002', recipient: expect.anything(), regionId: 14,
        }),
      );
    });

    it('should update status if it is newer', async () => {
      const fileName = 'GranteeTTAPlanTest.csv';
      downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });

      const goalInProgress = await Goal.findOne({
        where: { status: 'In Progress' },
      });
      await goalInProgress.update({
        status: 'Not Started',
      });
      const goalNotStarted = await Goal.findOne({
        where: { id: goalInProgress.id },
      });
      expect(goalNotStarted.status).toBe('Not Started');

      await importGoals(fileName, 14);

      const updatedGoal = await Goal.findOne({
        where: { id: goalInProgress.id },
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
      });
      await goalNotStarted.update({
        status: 'Suspended',
      });
      const goalSuspended = await Goal.findOne({
        where: { id: goalNotStarted.id },
      });
      expect(goalSuspended.status).toBe('Suspended');

      await importGoals(fileName, 14);

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
      });
      expect(goalWithTimeframe.timeframe).toBe('6 months');

      await goalWithTimeframe.update({
        timeframe: '12 months',
      });
      const modifiedGoal = await Goal.findOne({
        where: { id: goalWithTimeframe.id },
      });
      expect(modifiedGoal.timeframe).toBe('12 months');

      await importGoals(fileName, 14);

      const updatedGoal = await Goal.findOne({
        where: { id: goalWithTimeframe.id },
      });
      expect(updatedGoal.timeframe).toBe('6 months');
    });

    it('is idempotent', async () => {
      const fileName = 'GranteeTTAPlanTest.csv';
      downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });

      const allGoals = await Goal.findAll();
      expect(allGoals).toBeDefined();

      await importGoals(fileName, 14);

      const allGoals2 = await Goal.findAll();
      expect(allGoals2).toBeDefined();
      expect(allGoals2.length).toBe(allGoals.length);
    });

    it('should import goals from another region', async () => {
      const fileName = 'R9GranteeTTAPlanTest.csv';
      downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });

      const goalsBefore = await Goal.findAll();

      expect(goalsBefore.length).toBe(16);
      await importGoals(fileName, 9);

      const allGoals = await Goal.findAll();
      expect(allGoals).toBeDefined();
      expect(allGoals.length).toBe(17);

      // test eager loading
      const goal = await Goal.findOne({
        where: { name: 'Demonstrate an understanding of Fiscal requirements for non-federal share.' },
        attributes: ['name', 'status', 'timeframe', 'isFromSmartsheetTtaPlan'],
        include: [{
          model: Grant,
          as: 'grant',
          attributes: ['id', 'number', 'regionId'],
        }],
      });
      expect(goal.name).toBe('Demonstrate an understanding of Fiscal requirements for non-federal share.');
      expect(goal.status).toBe('Not Started');
      expect(goal.timeframe).toBe('One month');
      expect(goal.isFromSmartsheetTtaPlan).toBe(true);

      expect(goal.grant.number).toBe('09HP044444');
      expect(goal.grant.regionId).toBe(9);
    });

    // it('should populate template id', async () => {
    //   const importedGoal = await Goal.findOne({
    //     where: { isFromSmartsheetTtaPlan: true },
    //   });

    //   expect(importedGoal.goalTemplateId).toBeDefined();
    //   expect(importedGoal.goalTemplateId).not.toBeNull();
    // });
  });
});
