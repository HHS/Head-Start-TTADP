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
  let resourceOutsideRange1;
  let resourceOutsideRange2;

  beforeAll(async () => {
    try {
      resourcesToUpdate1 = await Resource.create({
        url: 'https://www.legacy-resource1.com',
        title: null,
        individualHooks: true,
        createdAt: '2022-01-01T21:59:28.470Z',
      });

      resourcesToUpdate2 = await Resource.create({
        url: 'https://www.legacy-resource2.com',
        title: null,
        individualHooks: true,
        createdAt: '2022-01-02T21:59:28.470Z',
      });

      resourceToSkip = await Resource.create({
        url: 'https://www.non-legacy-resource.com',
        title: 'non-legacy-resource',
        individualHooks: true,
        createdAt: '2022-01-03T21:59:28.470Z',
      });

      resourceOutsideRange1 = await Resource.create({
        url: 'https://www.resource-outside-range1.com',
        title: 'resource-outside-range1',
        individualHooks: true,
        createdAt: '2022-01-04T21:59:28.470Z',
      });

      resourceOutsideRange2 = await Resource.create({
        url: 'https://www.resource-outside-range2.com',
        title: 'resource-outside-range2',
        individualHooks: true,
        createdAt: '2021-12-31T21:59:28.470Z',
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
          id: [
            resourcesToUpdate1.id,
            resourcesToUpdate2.id,
            resourceToSkip.id,
            resourceOutsideRange1.id,
            resourceOutsideRange2.id,
          ],
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
    await processLegacyResources('01/01/2022', '01/03/2022');
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

    expect(addGetResourceMetadataToQueue).not.toHaveBeenCalledWith(
      resourceOutsideRange1.id,
      resourceOutsideRange1.url,
    );

    expect(addGetResourceMetadataToQueue).not.toHaveBeenCalledWith(
      resourceOutsideRange2.id,
      resourceOutsideRange2.url,
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
