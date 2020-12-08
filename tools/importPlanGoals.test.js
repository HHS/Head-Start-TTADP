import importGoals from './importPlanGoals';
import db, {
  Role, Topic, RoleTopic, Goal, Grantee, Grant,
} from '../src/models';

describe('Import TTA plan goals', () => {
  afterAll(() => {
    db.sequelize.close();
  });
  it('should import Roles table', async () => {
    await Role.destroy({ where: {} });
    const rolesBefore = await Role.findAll();

    expect(rolesBefore.length).toBe(0);
    await importGoals('GranteeTTAPlanTest.csv');

    const roles = await Role.findAll();
    expect(roles).toBeDefined();
    expect(roles.length).toBe(4);

    const roleNames = [];
    roles.forEach((role) => roleNames.push(role.name));
    expect(roleNames).toStrictEqual(['HS', 'FES', 'ECS', 'GS']);

    // test eager loading
    const role = await Role.findOne({
      where: { id: 1 },
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
      where: { id: 1 },
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
    expect(topic.roles[0].name).toBe('HS');
    expect(topic.roles[1].name).toBe('FES');

    // test lazy loading
    const topicRoles = await topic.getRoles();
    expect(topicRoles.length).toBe(2);
    expect(topicRoles[0].name).toBe('HS');
    expect(topicRoles[1].name).toBe('FES');
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
      where: { id: 10 },
      attributes: ['name', 'status', 'timeframe'],
      include: [{
        model: Topic,
        as: 'topics',
        attributes: ['id', 'name'],
        through: {
          attributes: [],
        },
      }],
    });
    expect(goal.name).toBe('Expand children\'s experiences with high quality early learning to prepare them for Kindergarten');
    expect(goal.status).toBe('Not Started');
    expect(goal.timeframe).toBe('Dates to be determined by October 30, 2020');
    expect(goal.topics.length).toBe(2);
    expect(goal.topics[0].name).toEqual('Child Assessment, Development, Screening');
    expect(goal.topics[1].name).toEqual('Coaching / Teaching / Instructional Support');
  });

  it('should import Grantees table', async () => {
    await Grant.destroy({ where: [] });
    await Grantee.destroy({ where: {} });
    const granteesBefore = await Grantee.findAll();

    expect(granteesBefore.length).toBe(0);

    await importGoals('GranteeTTAPlanTest.csv');
    const grantees = await Grantee.findAll();
    expect(grantees).toBeDefined();
    expect(grantees.length).toBe(4);

    // test eager loading
    const grantee = await Grantee.findOne({
      where: { id: 1 },
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

  it('should import Grants table', async () => {
    await Grant.destroy({ where: {} });
    const grantsBefore = await Grant.findAll();

    expect(grantsBefore.length).toBe(0);
    await importGoals('GranteeTTAPlanTest.csv');

    const grants = await Grant.findAll();
    expect(grants).toBeDefined();
    expect(grants.length).toBe(4);
    expect(grants[1].number).toBe('14CH10000');
  });

  it('should import RoleTopics table', async () => {
    await Topic.destroy({ where: {} });

    const roleTopicsBefore = await RoleTopic.findAll();

    expect(roleTopicsBefore.length).toBe(0);
    await importGoals('GranteeTTAPlanTest.csv');

    const roleTopics = await RoleTopic.findAll();
    expect(roleTopics).toBeDefined();
    expect(roleTopics.length).toBe(20);
  });
});
