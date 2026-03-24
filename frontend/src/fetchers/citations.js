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

/**
 * Fetch citation text by citation name.
 * @param {String[]} citationIds
 * @returns {Promise<{ text: String; citation: String; }[]>}
 */
export async function fetchCitationTextByName(citationIds) {
  const uniqueCitationIds = [...new Set(citationIds)];
  const params = new URLSearchParams();
  uniqueCitationIds.forEach((name) => {
    params.append('citationIds', encodeURIComponent(name));
  });

  const url = join(
    '/',
    'api',
    'citations',
    'text',
    `?${params.toString()}`,
  );
  const citations = await get(url);
  return citations.json();
}
