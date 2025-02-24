/* eslint-disable @typescript-eslint/dot-notation */
/* eslint-disable no-underscore-dangle */
import db, {
  Resource,
} from '../models';
import processLegacyResources from './populateLegacyResourceTitles';
import { auditLogger } from '../logger';

jest.mock('bull');

// mock addGetResourceMetadataToQueue.
jest.mock('../services/resourceQueue', () => ({
  addGetResourceMetadataToQueue: jest.fn(),
}));

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
