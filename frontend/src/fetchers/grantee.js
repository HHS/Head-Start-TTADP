import join from 'url-join';
import {
  get,
} from './index';
import { DECIMAL_BASE } from '../Constants';

const granteeUrl = join('/', 'api', 'grantee');

// eslint-disable-next-line import/prefer-default-export
export const searchGrantees = async (query, regionId = '') => {
  try {
    if (!query) {
      throw new Error('Please provide a query string to search grantees');
    }

    const querySearch = `?s=${query}`;
    const regionSearch = regionId ? `&region=${regionId.toString(DECIMAL_BASE)}` : '';

    const grantees = await get(
      join(granteeUrl, 'search', querySearch, regionSearch),
    );

    return grantees.json();
  } catch (e) {
    // todo - this should probably not throw an error, so it doesn't crash the frontend on a 404
    throw new Error(e);
  }
};
