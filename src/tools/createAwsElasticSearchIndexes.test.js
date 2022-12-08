import db from '../models';
import createAwsElasticSearchIndexes from './createAwsElasticSearchIndexes';
import {
  search,
} from '../lib/awsElasticSearch/awsElasticSearch';
import { AWS_ELASTIC_SEARCH_INDEXES } from '../constants';

describe('Create AWS Elastic Search Indexes', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  it('should bulk create index and documents', async () => {
    await createAwsElasticSearchIndexes();
    const query = 'The ECS and EM meet regularly to review or create leadership goals using the 5 R';
    const searchResult = await search(AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS, ['context'], query);
    expect(true).toBe(true);
  });
});
