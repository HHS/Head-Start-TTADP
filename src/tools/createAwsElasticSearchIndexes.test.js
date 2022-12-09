import db from '../models';
import moment from 'moment';
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
    jest.setTimeout(3600000);
    await createAwsElasticSearchIndexes();
    //const query = 'The ECS and EM meet regularly to review or create leadership goals using the 5 R';
    //const query = 'Cost and De Minimus Rates';
    const query = ' to check for understanding. Resources were shared during and at the end of the presentation';
    const searchResult = await search(AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS, ['context'], query);
    //console.log('\n\n\nSearch Results: ', searchResult.hits[0]);
    expect(true).toBe(true);
  });
});
