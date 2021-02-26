import { Op } from 'sequelize';
import importGoals from './importPlanGoals';
import { processFiles } from '../lib/updateGrantsGrantees';
import db, {
  Role, Topic, RoleTopic, Goal, Grantee, Grant,
} from '../models';

describe('Import TTA plan goals', () => {
  afterAll(() => {
    db.sequelize.close();
  });
  describe('Update grants and grantees', () => {
    beforeAll(async () => {
      await Grant.destroy({ where: { id: { [Op.gt]: 20 } } });
      await Grantee.destroy({ where: { id: { [Op.gt]: 20 } } });
    });
    afterEach(async () => {
      await Grant.destroy({ where: { id: { [Op.gt]: 20 } } });
      await Grantee.destroy({ where: { id: { [Op.gt]: 20 } } });
    });
    it('should import or update grantees', async () => {
      const granteesBefore = await Grantee.findAll({ where: { id: { [Op.gt]: 20 } } });
      expect(granteesBefore.length).toBe(0);
      await processFiles();

      const grantee = await Grantee.findOne({ where: { id: 1335 } });
      expect(grantee).toBeDefined();
      expect(grantee.name).toBe('Agency 1, Inc.');
    });

    it('should import or update grants', async () => {
      const grantsBefore = await Grant.findAll({ where: { id: { [Op.gt]: 20 } } });

      expect(grantsBefore.length).toBe(0);
      await processFiles();

      const grants = await Grant.findAll({ where: { granteeId: 1335 } });
      expect(grants).toBeDefined();
      expect(grants.length).toBe(3);
      const containsNumber = grants.some((g) => g.number === '02CH01111');
      expect(containsNumber).toBeTruthy();
    });

    it('should exclude grantees with only inactive grants', async () => {
      await processFiles();
      let grantee = await Grantee.findOne({ where: { id: 119 } });
      expect(grantee).toBeNull();
      // Same grantee, but with a different id and having an active grant
      grantee = await Grantee.findOne({ where: { id: 7709 } });
      expect(grantee.name).toBe('Multi ID Agency');
    });

    it('should update an existing grantee if it exists in smarthub', async () => {
      const [dbGrantee] = await Grantee.findOrCreate({ where: { id: 119, name: 'Multi ID Agency' } });
      await processFiles();
      const grantee = await Grantee.findOne({ where: { id: 119 } });
      expect(grantee).not.toBeNull();
      // Same grantee, but with a different id and having an active grant
      expect(grantee.updatedAt).not.toEqual(dbGrantee.updatedAt);
      expect(grantee.name).toBe('Multi ID Agency');
    });

    it('should update an existing grant if it exists in smarthub', async () => {
      await processFiles();
      let grant = await Grant.findOne({ where: { id: 5151 } });
      expect(grant).toBeNull();

      await Grantee.findOrCreate({ where: { id: 119, name: 'Multi ID Agency' } });
      const [dbGrant] = await Grant.findOrCreate({ where: { id: 5151, number: '90CI4444', granteeId: 119 } });
      await processFiles();
      grant = await Grant.findOne({ where: { id: 5151 } });
      expect(grant).not.toBeNull();
      expect(grant.updatedAt).not.toEqual(dbGrant.updatedAt);
      expect(grant.number).toBe('90CI4444');
    });
  });

  it('should import Roles table', async () => {
    await Role.destroy({ where: {} });
    const rolesBefore = await Role.findAll();

    expect(rolesBefore.length).toBe(0);
    await importGoals('GranteeTTAPlanTest.csv');

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
    await Topic.destroy({ where: {} });
    const topicsBefore = await Topic.findAll();

    expect(topicsBefore.length).toBe(0);
    await importGoals('GranteeTTAPlanTest.csv');

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
    await Goal.destroy({ where: {} });
    const goalsBefore = await Goal.findAll();

    expect(goalsBefore.length).toBe(0);
    await importGoals('GranteeTTAPlanTest.csv');

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
    await importGoals('GranteeTTAPlanTest.csv');

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
    await Topic.destroy({ where: {} });

    const roleTopicsBefore = await RoleTopic.findAll();

    expect(roleTopicsBefore.length).toBe(0);
    await importGoals('GranteeTTAPlanTest.csv', 14);

    const roleTopics = await RoleTopic.findAll();
    expect(roleTopics).toBeDefined();
    expect(roleTopics.length).toBe(20);
  });

  it('should import goals from another region', async () => {
    const goalsBefore = await Goal.findAll();

    expect(goalsBefore.length).toBe(12);
    await importGoals('R9GranteeTTAPlanTest.csv', 9);

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
