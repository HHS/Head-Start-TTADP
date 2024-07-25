import Queue from 'bull';
import { RESOURCE_ACTIONS } from '../constants';
import { addGetResourceMetadataToQueue, resourceQueue } from './resourceQueue';
import db, { Resource } from '../models';

jest.mock('bull');

describe('Resource queue manager tests', () => {
  let resource;
  const mockPassword = 'SUPERSECUREPASSWORD';
  const originalEnv = process.env;

  beforeAll(async () => {
    process.env.REDIS_PASS = mockPassword;
    resource = await Resource.create({ url: 'https://www.test-resource-queue.com' });
    jest.spyOn(resourceQueue, 'add').mockImplementation(() => jest.fn());
  });

  afterAll(async () => {
    await Resource.destroy({ where: { id: resource.id } });
    await db.sequelize.close();
    process.env = originalEnv;
  });

  beforeEach(() => {
    Queue.mockImplementation(() => resourceQueue);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('test schedule get resource metadata', async () => {
    await addGetResourceMetadataToQueue(resource.id, resource.key);
    expect(resourceQueue.add).toHaveBeenCalled();
  });

  it('calls resource.add', async () => {
    await addGetResourceMetadataToQueue(resource.id, resource.key);
    expect(resourceQueue.add).toHaveBeenCalledWith(
      RESOURCE_ACTIONS.GET_METADATA,
      {
        resourceId: resource.id,
        resourceUrl: resource.key,
        key: RESOURCE_ACTIONS.GET_METADATA,
      },
      {
        attempts: process.env.RESOURCE_METADATA_RETRIES || 3,
        backoff: {
          type: 'exponential',
          delay: process.env.RESOURCE_METADATA_BACKOFF_DELAY || 10000,
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  });
});
