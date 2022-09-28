import { readFileSync } from 'fs';
import importGoals from './importPlanGoals';
import { downloadFile } from '../lib/s3';
import db, {
  Role, Topic, RoleTopic, Goal, Grant,
} from '../models';

jest.mock('../lib/s3');

describe('Import TTA plan goals', () => {
  beforeEach(async () => {
    downloadFile.mockReset();
  });
  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('for a single region', () => {
    let roles;
    let goals;
    let existingTopics;

    beforeAll(async () => {
      try {
        const fileName = 'GranteeTTAPlanTest.csv';
        downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });
        roles = JSON.stringify(await Role.findAll({ raw: true }));
        goals = JSON.stringify(await Goal.findAll({ raw: true }));
        existingTopics = JSON.stringify(await Topic.findAll({ raw: true }));
        await Role.destroy({ where: {}, force: true, individualHooks: true });
        await Topic.destroy({ where: {}, force: true, individualHooks: true });
        await Goal.destroy({ where: {}, individualHooks: true });
        await importGoals(fileName, 14);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(`Unable to setup Import Plan Goals test ${error}`);
      }
    });

    afterAll(async () => {
      await Role.destroy({ where: {}, force: true, individualHooks: true });
      await Topic.destroy({ where: {}, force: true, individualHooks: true });
      await Goal.destroy({ where: {}, individualHooks: true });

      await Topic.bulkCreate(JSON.parse(existingTopics));
      await Goal.bulkCreate(JSON.parse(goals));
      await Role.bulkCreate(JSON.parse(roles));

      await db.sequelize.close();
    });

    it('should import Topics table', async () => {
      const topics = await Topic.findAll();
      expect(topics).toBeDefined();
      expect(topics.length).toBe(14);

      // test eager loading
      const topic = await Topic.findOne({
        where: { name: 'Behavioral / Mental Health' },
        include: [
          {
            model: Role,
            as: 'roles',
            attributes: ['name'],
          },
        ],
      });
      expect(topic.name).toEqual('Behavioral / Mental Health');
      expect(topic.roles.length).toBe(2);
      expect(topic.roles).toContainEqual(
        expect.objectContaining({ name: 'HS' }),
      );

      expect(topic.roles).toContainEqual(
        expect.objectContaining({ name: 'FES' }),
      );

      // test lazy loading
      const topicRoles = await topic.getRoles();
      expect(topicRoles.length).toBe(2);
      expect(topicRoles).toContainEqual(
        expect.objectContaining({ name: 'HS' }),
      );

      expect(topicRoles).toContainEqual(
        expect.objectContaining({ name: 'FES' }),
      );
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

    it('should import RoleTopics table', async () => {
      const roleTopics = await RoleTopic.findAll();
      expect(roleTopics).toBeDefined();
      expect(roleTopics.length).toBe(20);
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
  });
});
