/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import { get } from './index';

const getStateCodes = async () => {
  const res = await get(join('/', 'api', 'users', 'stateCodes'));
  return res.json();
};

export {
  getStateCodes,
};
