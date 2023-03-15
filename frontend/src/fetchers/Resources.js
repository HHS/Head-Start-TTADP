import join from 'url-join';
import { get } from './index';

const fetchResourceData = async (query) => {
  const res = await get(join('/', 'api', 'resources', `?${query}`));
  return res.json();
};

export default fetchResourceData;
