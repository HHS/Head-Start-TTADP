import join from 'url-join';
import {
  get,
  put,
  post,
  destroy,
} from './index';

const groupsUrl = join('/', 'api', 'groups');

export const fetchGroups = async () => {
  const response = await get(groupsUrl);
  return response.json();
};

export const fetchGroup = async (groupId) => {
  const getGroup = join(groupsUrl, String(groupId));
  const response = await get(getGroup);
  return response.json();
};

/*
export const fetchGroup = async (groupId) => ({
  id: 1,
  name: 'group1',
  grants: [
    {
      id: 1,
      name: 'grant1',
      regionId: 1,
    },
  ],
  isPublic: true,
  shareWithEveryone: true,
  coOwners: [
    {
      id: 1,
      name: 'co-owner1',
      regionId: 1,
    },
  ],
  individuals: [
    {
      id: 1,
      name: 'individual1',
      regionId: 1,
    },
  ],
});
*/

export const createGroup = async (group) => {
  const response = await post(groupsUrl, group);
  return response.json();
};

export const updateGroup = async (group) => {
  const response = await put(join(groupsUrl, String(group.id)), group);
  return response.json();
};

export const deleteGroup = async (groupId) => {
  const response = await destroy(join(groupsUrl, String(groupId)));
  return response.json();
};
