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
    const grantee = await get(
      // convert to string after checking it's an int, this way it'll throw to the
      // catch if not a parseable int
      join(granteeUrl, parseInt(granteeId, DECIMAL_BASE).toString(DECIMAL_BASE), regionSearch),
    );
    return grantee.json();
  } catch (e) {
    return {};
  }
};
