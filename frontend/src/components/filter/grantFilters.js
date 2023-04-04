/* eslint-disable import/prefer-default-export */
import React, { useContext } from 'react';
import { FILTER_CONDITIONS, EMPTY_MULTI_SELECT } from '../../Constants';
import FilterGroups from './FilterGroups';
import { MyGroupsContext } from '../MyGroupsProvider';

const useDisplayGroups = (query) => {
  const { myGroups } = useContext(MyGroupsContext);

  if (!query || query.length === 0) {
    return '';
  }

  return [query].flat().map((q) => {
    const group = myGroups.find((g) => g.id === q);
    return group ? group.name : '';
  }).join(', ');
};

export const groupsFilter = {
  id: 'group',
  display: 'Group',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: useDisplayGroups,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterGroups
      inputId={`group-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};
