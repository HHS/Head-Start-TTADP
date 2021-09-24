import join from 'url-join';
import {
  get,
} from './index';
import { DECIMAL_BASE } from '../Constants';

const granteeUrl = join('/', 'api', 'grantee');

// eslint-disable-next-line import/prefer-default-export
export const searchGrantees = async (query, regionId = '', params = { sortBy: 'name', direction: 'asc', offset: 0 }) => {
  if (!query) {
    throw new Error('Please provide a query string to search grantees');
  }

  const querySearch = `?s=${query}`;
  const regionSearch = regionId ? `&region=${regionId.toString(DECIMAL_BASE)}` : '';

  const grantees = await get(
    join(granteeUrl, 'search', querySearch, regionSearch, `&sortBy=${params.sortBy}&direction=${params.direction}&offset=${params.offset}`),
  );

  return grantees.json();
};
