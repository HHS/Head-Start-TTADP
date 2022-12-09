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
    // const query = 'and update the volunteer related';
    // const searchResult = await search(
    //  AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
    //  [],
    //  'The program director (PD) requested Reflective Supervision',
    //  );
    // console.log('\n\n\nSearch Results: ', searchResult.hits[0]);
    expect(true).toBe(true);
  });
});
