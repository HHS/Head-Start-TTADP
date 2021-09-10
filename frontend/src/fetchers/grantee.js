import join from 'url-join';
import {
  get,
} from './index';
import { DECIMAL_BASE } from '../Constants';

const granteeUrl = join('/', 'api', 'grantee');

// eslint-disable-next-line import/prefer-default-export
export const getGrantee = async (granteeId, regionId = '') => {
  try {
    const regionSearch = regionId ? `?region=${regionId.toString(DECIMAL_BASE)}` : '';

    const id = parseInt(granteeId, DECIMAL_BASE);

    if (Number.isNaN(id)) {
      throw new Error('Grantee ID must be a number');
    }

    const grantee = await get(
      join(granteeUrl, id.toString(DECIMAL_BASE), regionSearch),
    );

    return grantee.json();
  } catch (e) {
    throw new Error(e);
  }
};
