import Queue from 'bull';
import { addGetResourceMetadataToQueue, resourceQueue } from './resourceQueue';
import db, { Resource } from '../models';

jest.mock('bull');

describe('Resource queue manager tests', () => {
  let resource;
  beforeAll(async () => {
    resource = await Resource.create({ url: 'https://www.test-resource-queue.com' });
    jest.spyOn(resourceQueue, 'add').mockImplementation(() => jest.fn());
  });
  afterAll(async () => {
    await Resource.destroy({ where: { id: resource.id } });
    await db.sequelize.close();
  });

  it('test schedule get resource metadata', async () => {
    await addGetResourceMetadataToQueue(
      resource.id,
      resource.key,
    );
    expect(resourceQueue.add).toHaveBeenCalled();
  });

  it('calls resource.add', async () => {
    await addGetResourceMetadataToQueue(
      resource.id,
      resource.key,
    );
    expect(Queue).toHaveBeenCalledWith('resource', 'redis://undefined:6379', { redis: { password: undefined } });
    expect(resourceQueue.add).toHaveBeenCalled();
  });
});
