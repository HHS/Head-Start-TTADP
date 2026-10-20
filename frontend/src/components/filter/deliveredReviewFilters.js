import { EMPTY_MULTI_SELECT, FILTER_CONDITIONS } from '../../Constants';
import FilterReviewType from './FilterReviewType';
import { handleArrayQuery } from './helpers';

export const reviewTypeFilter = {
  id: 'reviewType',
  display: 'Review type',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterReviewType
      inputId={`reviewType-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};
