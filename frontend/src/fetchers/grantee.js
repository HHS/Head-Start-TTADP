import join from 'url-join';
import { get } from './index';
import { DECIMAL_BASE } from '../Constants';
import { filtersToQueryString } from '../components/Filter';

const granteeUrl = join('/', 'api', 'grantee');

export const getGrantee = async (granteeId, regionId = '') => {
  const regionSearch = regionId ? `?region.in[]=${regionId.toString(DECIMAL_BASE)}` : '';
  const id = parseInt(granteeId, DECIMAL_BASE);

  if (Number.isNaN(id)) {
    throw new Error('Grantee ID must be a number');
  }

  const grantee = await get(
    join(granteeUrl, id.toString(DECIMAL_BASE), regionSearch),
  );
  return grantee.json();
};

export const searchGrantees = async (query, filters, params = { sortBy: 'name', direction: 'asc', offset: 0 }) => {
  const querySearch = `?s=${query || ''}`;
  const queryParams = filtersToQueryString(filters);

  const grantees = await get(
    join(granteeUrl, 'search', `${querySearch}&${queryParams}`, `&sortBy=${params.sortBy}&direction=${params.direction}&offset=${params.offset}`),
  );

  return grantees.json();
};
