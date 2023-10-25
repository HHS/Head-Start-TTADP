/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import { get } from './index';

export const findAllofEnum = async (enumName, enumType) => {
  const data = await get((join('/', 'api', 'enum', 'enumName', enumName, 'enumType', enumType)));
  return data.json();
};
