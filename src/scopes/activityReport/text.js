/* eslint-disable dot-notation */
import { Op } from 'sequelize';
//import { sequelize } from '../../models';
import { AWS_ELASTIC_SEARCH_INDEXES, DECIMAL_BASE } from '../../constants';
import { search } from '../../lib/awsElasticSearch/index';

async function searchText(text) {
  const searchResult = await search(AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS, [], text[0]);
  const reportIds = searchResult.hits.map((r) => parseInt(r['_id'], DECIMAL_BASE));
  return reportIds;
}

export async function withText(text) {
  const reportIds = await searchText(text);
  console.log('\n\n\n------ Values', reportIds, text);
  return { id: { [Op.in]: reportIds } };
}

export async function withoutText(text) {
  const reportIds = await searchText(text);
  return { id: { [Op.notIn]: reportIds } };
}
