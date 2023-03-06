/* eslint-disable import/prefer-default-export */
import React from 'react';
import { FILTER_CONDITIONS, EMPTY_MULTI_SELECT } from '../../Constants';
import { handleArrayQuery } from './helpers';
import FilterGroups from './FilterGroups';

export const groupsFilter = {
  id: 'group',
  display: 'Group',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterGroups
      inputId={`group-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};
