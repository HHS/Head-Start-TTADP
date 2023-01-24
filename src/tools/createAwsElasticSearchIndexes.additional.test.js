/* eslint-disable dot-notation */
import db, {
  ActivityReport,
} from '../models';
import createAwsElasticSearchIndexes from './createAwsElasticSearchIndexes';
import { auditLogger, logger } from '../logger';

jest.mock('../lib/awsElasticSearch/index', () => ({
  getClient: jest.fn(() => ({})),
  deleteIndex: jest.fn(),
  createIndex: jest.fn(),
}));

describe('Create AWS Elastic Search Indexes', () => {
  describe('error states', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    afterAll(async () => {
      await db.sequelize.close();
    });

    it('no reports to index', async () => {
      ActivityReport.findAll = jest.fn().mockResolvedValueOnce([]);
      jest.spyOn(logger, 'info');

      // Create Indexes.
      await createAwsElasticSearchIndexes();
      expect(logger.info).toHaveBeenCalledWith('Search Index Job Info: No reports found to index.');
    });

    it('search index job error', async () => {
      ActivityReport.findAll = jest.fn().mockRejectedValueOnce(new Error('test error'));

      jest.spyOn(auditLogger, 'error');

      // Create Indexes.
      await createAwsElasticSearchIndexes();

      expect(auditLogger.error).toHaveBeenCalledWith('Search Index Job Error: Error: test error');
    });
  });
});
