/* eslint-disable @typescript-eslint/dot-notation */
/* eslint-disable no-underscore-dangle */
import db, {
  Resource,
} from '../models';
import processLegacyResources from './populateLegacyResourceTitles';
import { addGetResourceMetadataToQueue } from '../services/resourceQueue';
import { auditLogger } from '../logger';

jest.mock('bull');

// mock addGetResourceMetadataToQueue.
jest.mock('../services/resourceQueue', () => ({
  addGetResourceMetadataToQueue: jest.fn(),
}));

describe('Create AWS Elastic Search Indexes', () => {
  let resourcesToUpdate1;
  let resourcesToUpdate2;
  let resourceToSkip;

  beforeAll(async () => {
    try {
      resourcesToUpdate1 = await Resource.create({
        url: 'https://www.legacy-resource1.com',
        title: null,
        individualHooks: true,
      });

      resourcesToUpdate2 = await Resource.create({
        url: 'https://www.legacy-resource2.com',
        title: null,
        individualHooks: true,
      });

      resourceToSkip = await Resource.create({
        url: 'https://www.non-legacy-resource.com',
        title: 'non-legacy-resource',
        individualHooks: true,
      });
    } catch (e) {
      auditLogger.error(JSON.stringify(e));
      throw e;
    }
  });

  afterAll(async () => {
    try {
      await Resource.destroy({
        where: {
          id: [resourcesToUpdate1.id, resourcesToUpdate2.id, resourceToSkip.id],
        },
        force: true,
      });
      await db.sequelize.close();
    } catch (e) {
      auditLogger.error(JSON.stringify(e));
      throw e;
    }
  });

  it('should queue the correct resources', async () => {
    await processLegacyResources();
    // Assert addGetResourceMetadataToQueue was called with the correct resources.
    expect(addGetResourceMetadataToQueue).toHaveBeenCalledWith(
      resourcesToUpdate1.id,
      resourcesToUpdate1.url,
    );
    expect(addGetResourceMetadataToQueue).toHaveBeenCalledWith(
      resourcesToUpdate2.id,
      resourcesToUpdate2.url,
    );
    expect(addGetResourceMetadataToQueue).not.toHaveBeenCalledWith(
      resourceToSkip.id,
      resourceToSkip.url,
    );
  });
});

describe('error states', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  it('process legacy resources error', async () => {
    Resource.findAll = jest.fn().mockRejectedValueOnce(new Error('test error'));

    jest.spyOn(auditLogger, 'error');

    await processLegacyResources();

    expect(auditLogger.error).toHaveBeenCalled();
  });
});
