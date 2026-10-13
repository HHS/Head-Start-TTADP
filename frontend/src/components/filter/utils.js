import { useContext } from 'react';
import { CommunicationLogUsersContext } from '../CommunicationLogUsersProvider';
import { MyGroupsContext } from '../MyGroupsProvider';
import { StaffContext } from '../StaffProvider';

export const contextQuery = (query, haystack, needle, value) =>
  [query]
    .flat()
    .map((q) => {
      // Convert both to strings for comparison
      const discovered = haystack.find((g) => String(g[needle]) === String(q));
      return discovered ? discovered[value] : '';
    })
    .join(', ');

export const useDisplayGroups = (query) => {
  const { myGroups } = useContext(MyGroupsContext);

  if (!query || query.length === 0) {
    return '';
  }

  return contextQuery(query, myGroups, 'id', 'name');
};

export const useDisplayStaff = (query) => {
  const { staff } = useContext(StaffContext);

  if (!query || query.length === 0) {
    return '';
  }

  return contextQuery(query, staff, 'id', 'fullName');
};

export const useDisplayCommunicationLogStaff = (query) => {
  const { users } = useContext(CommunicationLogUsersContext);

  if (!query || query.length === 0) {
    return '';
  }

  return contextQuery(query, users, 'id', 'name');
};

export const fixQueryWhetherStringOrArray = (query) => {
  if (Array.isArray(query)) {
    return query.join(', ');
  }
  return query;
};
