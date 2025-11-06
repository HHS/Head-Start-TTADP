import db, { Topic } from '../models';
import { getAllTopics } from './topics';

describe('getAllTopics', () => {
  let deprecatedTopic;
  let regularTopic;

  beforeAll(async () => {
    // Create a deprecated topic if it doesn't exist
    [deprecatedTopic] = await Topic.findOrCreate({
      where: { name: 'Environmental Health and Safety / EPRR DEP', deprecated: true },
    });

    // Create a regular topic for comparison
    [regularTopic] = await Topic.findOrCreate({
      where: { name: 'Test Regular Topic' },
      defaults: { name: 'Test Regular Topic' },
    });
  });

  afterAll(async () => {
    // Clean up the test data
    await Topic.destroy({
      where: { id: [deprecatedTopic.id, regularTopic.id] },
      force: true,
    });
    await db.sequelize.close();
  });

  it('gets all topics', async () => {
    const topicsRaw = await Topic.findAll(
      {
        attributes: ['id'],
        where: { deprecated: false },
      },
    );

    const topicsFromFunc = await getAllTopics();

    expect(topicsRaw.length).toBe(topicsFromFunc.length);
  });

  it('excludes deprecated topic names', async () => {
    const topicsFromFunc = await getAllTopics();
    const topicNames = topicsFromFunc.map((topic) => topic.name);

    // Ensure the deprecated topic is not included
    expect(topicNames).not.toContain('Environmental Health and Safety / EPRR');

    // Ensure regular topics are still included
    expect(topicNames).toContain('Test Regular Topic');
  });
});
