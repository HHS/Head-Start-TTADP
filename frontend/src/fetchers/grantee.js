import join from 'url-join';
import {
  get,
} from './index';
import { DECIMAL_BASE } from '../Constants';

const granteeUrl = join('/', 'api', 'grantee');

// eslint-disable-next-line import/prefer-default-export
export const getGrantee = async (granteeId, regionId = '') => {
  try {
    const regionSearch = regionId ? `?region.in[]=${regionId.toString(DECIMAL_BASE)}` : '';
    const widgetType = '&widgetType=grant';
    const id = parseInt(granteeId, DECIMAL_BASE);

    if (Number.isNaN(id)) {
      throw new Error('Grantee ID must be a number');
    }

    const grantee = await get(
      join(granteeUrl, id.toString(DECIMAL_BASE), regionSearch, widgetType),
    );

    return grantee.json();
  } catch (e) {
    // todo - this should probably not throw an error, so it doesn't crash the frontend on a 404
    throw new Error(e);
  }
};
