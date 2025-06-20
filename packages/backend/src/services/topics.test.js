import db, { Topic } from '../models';
import { getAllTopics } from './topics';

describe('getAllTopics', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  it('gets all topics', async () => {
    const topicsRaw = await Topic.findAll(
      {
        attributes: ['id'],
      },
    );

    const topicsFromFunc = await getAllTopics();

    expect(topicsRaw.length).toBe(topicsFromFunc.length);
  });
});
