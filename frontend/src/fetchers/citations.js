/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import {
  get,
} from './index';

export async function fetchCitationsByGrant(region, grantIds, reportStartDate) {
  const formattedDate = new Date(reportStartDate).toISOString().split('T')[0];
  const url = join(
    '/',
    'api',
    'citations',
    'region',
    String(region),
    `?grantIds=${grantIds.join('&grantIds=')}&reportStartDate=${formattedDate}`,
  );
  const citations = await get(url);
  return citations.json();
}
