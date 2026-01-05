import { useContext } from 'react';
import { MyGroupsContext } from '../MyGroupsProvider';

export const useDisplayGroups = (query) => {
  const { myGroups } = useContext(MyGroupsContext);

  if (!query || query.length === 0) {
    return '';
  }

  return [query].flat().map((q) => {
    // Group IDs from API are numbers, but URL params are strings
    // Convert both to strings for comparison
    const group = myGroups.find((g) => String(g.id) === String(q));
    return group ? group.name : '';
  }).join(', ');
};

export const fixQueryWhetherStringOrArray = (query) => {
  if (Array.isArray(query)) {
    return query.join(', ');
  }
  return query;
};
