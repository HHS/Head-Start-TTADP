import { readFileSync } from 'fs';
import importGoals from './importPlanGoals';
import { downloadFile } from '../lib/s3';
import db, {
  Role, Topic, RoleTopic, Goal, Grantee, Grant,
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
    beforeAll(async () => {
      try {
        const fileName = 'GranteeTTAPlanTest.csv';
        downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });
        await Role.destroy({ where: {} });
        await Topic.destroy({ where: {} });
        await Goal.destroy({ where: {} });
        await importGoals(fileName, 14);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(`Unable to setup Import Plan Goals test ${error}`);
      }
    });

    it('should import Roles table', async () => {
      const roles = await Role.findAll({
        attributes: ['id', 'name', 'fullName'],
      });

      expect(roles).toBeDefined();
      expect(roles.length).toBe(16);

      expect(roles).toContainEqual(
        expect.objectContaining({ id: expect.anything(), name: 'HS', fullName: 'Health Specialist' }),
      );

      expect(roles).toContainEqual(
        expect.objectContaining({ id: expect.anything(), name: 'FES', fullName: 'Family Engagement Specialist' }),
      );

      // test eager loading
      const role = await Role.findOne({
        where: { name: 'HS' },
        include: [{
          model: Topic,
          as: 'topics',
          attributes: ['name'],
          through: {
            attributes: [],
          },
        }],
      });
      expect(role.name).toEqual('HS');
      const topicNames = role.topics.map((tp) => tp.get('name'));
      expect(role.topics.length).toBe(5);
      expect(role.topics[0].name).toEqual('Behavioral / Mental Health');
      expect(role.topics[1].name).toEqual('Environmental Health and Safety');
      expect(topicNames[0]).toEqual('Behavioral / Mental Health'); // topicNames is just an array of topic names without the key "name"

      // test lazy loading
      const roleTopics = await role.getTopics({
        attributes: ['name'],
      }).map((tp) => tp.get('name'));

      expect(roleTopics.length).toBe(5);
      expect(roleTopics[0]).toEqual('Behavioral / Mental Health');
      expect(roleTopics[1]).toEqual('Environmental Health and Safety');
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
            through: { attributes: [] },
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
      expect(allGoals.length).toBe(12);

      // test eager loading
      const goal = await Goal.findOne({
        where: { name: 'Expand children\'s experiences with high quality early learning to prepare them for Kindergarten' },
        attributes: ['name', 'status', 'timeframe', 'isFromSmartsheetTtaPlan'],
        include: [{
          model: Topic,
          as: 'topics',
          attributes: ['id', 'name'],
          through: {
            attributes: [],
          },
        },
        {
          model: Grantee,
          as: 'grantees',
          attributes: ['id', 'name'],
          through: {
            attributes: [],
          },
        },
        {
          model: Grant,
          as: 'grants',
          attributes: ['id', 'number', 'regionId'],
          through: {
            attributes: [],
          },
        }],
      });
      expect(goal.name).toBe('Expand children\'s experiences with high quality early learning to prepare them for Kindergarten');
      expect(goal.status).toBe('Not Started');
      expect(goal.timeframe).toBe('Dates to be determined by October 30, 2020');
      expect(goal.isFromSmartsheetTtaPlan).toBe(true);
      expect(goal.topics.length).toBe(2);
      expect(goal.topics).toContainEqual(
        expect.objectContaining({ id: expect.anything(), name: 'Child Assessment, Development, Screening' }),
      );
      expect(goal.topics).toContainEqual(
        expect.objectContaining({ id: expect.anything(), name: 'Coaching / Teaching / Instructional Support' }),
      );
      expect(goal.grantees.length).toBe(1);
      expect(goal.grantees[0].name).toEqual('Johnston-Romaguera');
      expect(goal.grants.length).toBe(2);
      expect(goal.grants).toContainEqual(
        expect.objectContaining({ id: expect.anything(), number: '14CH00002', regionId: 14 }),
      );
      expect(goal.grants).toContainEqual(
        expect.objectContaining({ id: expect.anything(), number: '14CH00003', regionId: 14 }),
      );
    });

    it('should have Grantees Goals connection', async () => {
    // test eager loading
      const grantee = await Grantee.findOne({
        where: { name: 'Grantee Name' },
        attributes: ['id', 'name'],
        include: [{
          model: Goal,
          as: 'goals',
          attributes: ['name', 'status', 'timeframe'],
          through: {
            attributes: [],
          },
        }],
      });
      expect(grantee.name).toBe('Grantee Name');
      expect(grantee.goals.length).toBe(2);
      expect(grantee.goals[0].name).toEqual('Identify strategies to support Professional Development with an emphasis on Staff Wellness and Social Emotional Development.');
      expect(grantee.goals[1].name).toEqual('Enhance reflective practice.');
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

      expect(goalsBefore.length).toBe(12);
      await importGoals(fileName, 9);

      const allGoals = await Goal.findAll();
      expect(allGoals).toBeDefined();
      expect(allGoals.length).toBe(13);

      // test eager loading
      const goal = await Goal.findOne({
        where: { name: 'Demonstrate an understanding of Fiscal requirements for non-federal share.' },
        attributes: ['name', 'status', 'timeframe', 'isFromSmartsheetTtaPlan'],
        include: [{
          model: Topic,
          as: 'topics',
          attributes: ['id', 'name'],
          through: {
            attributes: [],
          },
        },
        {
          model: Grantee,
          as: 'grantees',
          attributes: ['id', 'name'],
          through: {
            attributes: [],
          },
        },
        {
          model: Grant,
          as: 'grants',
          attributes: ['id', 'number', 'regionId'],
          through: {
            attributes: [],
          },
        }],
      });
      expect(goal.name).toBe('Demonstrate an understanding of Fiscal requirements for non-federal share.');
      expect(goal.status).toBe('Not Started');
      expect(goal.timeframe).toBe('One month');
      expect(goal.isFromSmartsheetTtaPlan).toBe(true);
      expect(goal.topics.length).toBe(1);
      expect(goal.topics[0].name).toEqual('Fiscal / Budget');

      expect(goal.grantees.length).toBe(1);
      expect(goal.grantees[0].name).toEqual('Agency 4, Inc.');
      expect(goal.grants.length).toBe(1);
      expect(goal.grants[0].number).toBe('09HP044444');
      expect(goal.grants[0].regionId).toBe(9);

      const goalWithTopic = await Goal.findOne({
        where: { name: 'Demonstrate an understanding of Fiscal requirements for non-federal share.' },
        attributes: ['name', 'status', 'timeframe', 'isFromSmartsheetTtaPlan'],
        include: [{
          model: Topic,
          as: 'topics',
          attributes: ['id', 'name'],
          through: {
            attributes: [],
          },
          include: [{
            model: Role,
            as: 'roles',
            through: {
              attributes: [],
            },
          }],
        }],
      });
      expect(goalWithTopic.topics[0].roles[0].fullName).toBe('Grantee Specialist');
    });
  });
});
