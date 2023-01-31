import { readFileSync } from 'fs';
import { expect } from '@playwright/test';
import createGoal from './goalPilot';
import { downloadFile } from '../lib/s3';
import db, {
  Goal, Grant, GoalTemplate,
} from '../models';

jest.mock('../logger');

jest.mock('../lib/s3');

const goalName = '(PILOT) Grant recipient will improve teacher-child interactions (as measured by CLASS scores)';
const fileName = 'src/tools/files/23CLASSPilotTest.csv';

describe('Goal pilot script', () => {
  beforeAll(async () => {
    await Goal.destroy({ where: { name: goalName } });
    await GoalTemplate.destroy({ where: { templateName: goalName } });
    downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });
  });
  afterEach(async () => {
    await Goal.destroy({ where: { name: goalName } });
    await GoalTemplate.destroy({ where: { templateName: goalName } });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  it('should create goals', async () => {
    await createGoal(fileName);
    const allGoals = await Goal.findAll({ where: { name: goalName } });
    expect(allGoals).toBeDefined();
    expect(allGoals.length).toBe(7);

    const goal = await Goal.findOne({
      where: { name: goalName },
      attributes: ['name', 'status', 'timeframe', 'isFromSmartsheetTtaPlan', 'goalTemplateId'],
      include: [{
        model: Grant,
        as: 'grant',
        attributes: ['id', 'number', 'regionId'],
      }],
    });

    const goalTemplate = await GoalTemplate.findOne(
      {
        where: { templateName: goalName },
        attributes: ['id'],
      },
    );
    expect(goal.name).toBe(goalName);
    expect(goal.status).toBe('Not Started');
    expect(goal.timeframe).toBeNull();
    expect(goal.isFromSmartsheetTtaPlan).toBe(false);
    expect(goal.goalTemplateId).not.toBeNull();
    expect(goal.goalTemplateId).toBe(goalTemplate.id);
    expect(['01HP044445', '09CH011111', '09CH033333', '13000002', '13000004', '14CH00003', '01HP044444']).toContain(goal.grant.number);
  });

  it('should create the goal template', async () => {
    await createGoal(fileName);

    const goalTemplate = await GoalTemplate.findOne({
      where: { templateName: goalName },
      attributes: ['id', 'regionId'],
    });

    expect(goalTemplate).not.toBeNull();
    expect(goalTemplate.regionId).toBeNull();
  });

  it('should set createdVia to rtr', async () => {
    await createGoal(fileName);

    const createdGoal = await Goal.findOne({ where: { name: goalName }, attributes: ['createdVia'] });

    expect(createdGoal.createdVia).toBe('rtr');
  });

  it('should set isRttapa to "No"', async () => {
    await createGoal(fileName);

    const createdGoal = await Goal.findOne({ where: { name: goalName }, attributes: ['isRttapa'] });

    expect(createdGoal.isRttapa).toBe('No');
  });

  it('should handle invalid grants gracefully', async () => {
    const count = await createGoal(fileName);

    const createdGoal = await Goal.findOne({
      where: { name: goalName },
      attributes: ['name'],
      include: [{
        model: Grant,
        as: 'grant',
        attributes: ['id', 'number'],
        where: { number: '14CH00003' },
      }],
    });

    expect(createdGoal).not.toBeNull();
    expect(count).not.toBe(0);
  });

  it('is idempotent', async () => {
    await createGoal(fileName);

    const allGoals = await Goal.findAll({ where: { name: goalName }, attributes: ['name'] });
    expect(allGoals).not.toBeNull();
    expect(allGoals.length).toBe(7);

    await createGoal(fileName);

    const allGoals2 = await Goal.findAll({ where: { name: goalName }, attributes: ['name'] });
    expect(allGoals).not.toBeNull();
    expect(allGoals2.length).toBe(allGoals.length);
  });
});
