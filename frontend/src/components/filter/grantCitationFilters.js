import { EMPTY_MULTI_SELECT, FILTER_CONDITIONS } from '../../Constants';
import FilterFindingCategory from './FilterFindingCategory';
import FilterFindingType from './FilterFindingType';
import { handleArrayQuery } from './helpers';

export const findingCategoryFilter = {
  id: 'findingCategory',
  display: 'Finding category',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterFindingCategory
      inputId={`findingCategory-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};

export const findingTypeFilter = {
  id: 'findingType',
  display: 'Finding type',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterFindingType
      inputId={`findingType-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};
