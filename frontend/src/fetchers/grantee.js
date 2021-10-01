import join from 'url-join';
import {
  get,
} from './index';
import { DECIMAL_BASE } from '../Constants';

const granteeUrl = join('/', 'api', 'grantee');

// eslint-disable-next-line import/prefer-default-export
export const getGrantee = async (granteeId, regionId = '') => {
  const regionSearch = regionId ? `?region.in[]=${regionId.toString(DECIMAL_BASE)}` : '';
  const modelType = '&modelType=grant';

  const id = parseInt(granteeId, DECIMAL_BASE);

  if (Number.isNaN(id)) {
    throw new Error('Grantee ID must be a number');
  }

  const grantee = await get(
    join(granteeUrl, id.toString(DECIMAL_BASE), regionSearch, modelType),
  );

  return grantee.json();
};
