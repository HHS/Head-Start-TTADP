/* eslint-disable max-len */
import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import {
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from './FilterDatePicker';
import DateRangePicker from './DateRangePicker';
import FilterInput from './FilterInput';

import {
  SELECT_CONDITIONS,
  DATE_CONDITIONS,
  WITHIN,
} from '../Constants';

export const selectRoleInput = (query, onUpdateFilter) => (
  <select
    name="query"
    className="smart-hub--filter-input smart-hub--filter-input-role-select"
    onChange={(e) => {
      onUpdateFilter('query', e.target.value);
    }}
    value={query}
    aria-label="Select specialist role to filter by"
  >
    <option value="Early Childhood Specialist">Early Childhood Specialist (ECS)</option>
    <option value="Family Engagement Specialist">Family Engagement Specialist (FES)</option>
    <option value="Grantee Specialist">Grantee Specialist (GS)</option>
    <option value="Health Specialist">Health Specialist (HS)</option>
    <option value="System Specialist">System Specialist (SS)</option>

  </select>
);

const singleSelectInput = (query, onUpdateFilter) => (
  <FilterInput
    term={query}
    onChange={(term) => {
      onUpdateFilter('query', term);
    }}
  />
);

const dateInput = (query, onUpdateFilter, condition, id) => {
  if (condition === WITHIN) {
    return (
      <DateRangePicker
        id={id}
        onUpdateFilter={onUpdateFilter}
        query={query}
      />
    );
  }

  return (
    <DatePicker
      id={id}
      onUpdateFilter={onUpdateFilter}
      query={query}
    />
  );
};

const commonFilters = [
  {
    id: 'reportId',
    display: 'Report ID',
    conditions: SELECT_CONDITIONS,
    renderInput: singleSelectInput,
  },
  {
    id: 'grantee',
    display: 'Grantee',
    conditions: SELECT_CONDITIONS,
    renderInput: singleSelectInput,
  },
  {
    id: 'startDate',
    display: 'Start date',
    conditions: DATE_CONDITIONS,
    renderInput: dateInput,
  },
  {
    id: 'creator',
    display: 'Creator',
    conditions: SELECT_CONDITIONS,
    renderInput: singleSelectInput,
  },
  {
    id: 'collaborators',
    display: 'Collaborator',
    conditions: SELECT_CONDITIONS,
    renderInput: singleSelectInput,
  },
  {
    id: 'role',
    display: 'Role',
    conditions: SELECT_CONDITIONS,
    renderInput: selectRoleInput,
  },
  {
    id: 'programSpecialist',
    display: 'Program Specialist',
    conditions: SELECT_CONDITIONS,
    renderInput: singleSelectInput,
  },
];

const myAlertsFilters = [
  ...commonFilters,
  {
    id: 'status',
    display: 'Status',
    conditions: SELECT_CONDITIONS,
    renderInput: singleSelectInput,
  },
];

const reportFilters = [
  ...commonFilters,
  {
    id: 'topic',
    display: 'Topic',
    conditions: SELECT_CONDITIONS,
    renderInput: singleSelectInput,
  },
  {
    id: 'lastSaved',
    display: 'Last saved',
    conditions: DATE_CONDITIONS,
    renderInput: dateInput,
  },
];

function FilterItem({
  topic,
  condition,
  query,
  onUpdateFilter,
  onRemoveFilter,
  id,
  forMyAlerts,
  forwardedRef,
}) {
  const possibleFilters = forMyAlerts ? myAlertsFilters : reportFilters;
  const selectedTopic = possibleFilters.find((filter) => filter.id === topic);
  const conditions = selectedTopic ? selectedTopic.conditions : [];
  const showQuery = selectedTopic && condition;

  const ariaLabel = `Filter: ${topic || 'no topic selected'} ${condition || 'no condition selected'} ${query || 'no query entered'}`;

  return (
    <div role="toolbar" aria-label={ariaLabel} tabIndex={0} ref={forwardedRef} className="margin-top-1 smart-hub--filter smart-hub--filter-item">
      <button
        type="button"
        aria-label="remove filter"
        className="usa-button usa-button--unstyled font-sans-xs margin-right-1 margin-left-0"
        onClick={onRemoveFilter}
      >
        <FontAwesomeIcon color="gray" icon={faTimesCircle} />
      </button>
      Where
      <select
        name="topic"
        aria-label="topic"
        value={topic}
        onChange={(e) => onUpdateFilter(e.target.name, e.target.value)}
        className="margin-left-2 smart-hub--filter-input height-205"
      >
        <option value="" hidden disabled>- Select -</option>
        {possibleFilters.map(({ id: filterId, display }) => (
          <option key={filterId} value={filterId}>{display}</option>
        ))}
      </select>
      <select
        name="condition"
        aria-label="condition"
        value={condition}
        onChange={(e) => onUpdateFilter(e.target.name, e.target.value)}
        className="margin-left-1 minw-15 smart-hub--filter-input height-205"
      >
        <option value="" hidden disabled>- Select -</option>
        {conditions.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <span className="margin-left-1">
        {showQuery && selectedTopic.renderInput(query, onUpdateFilter, condition, id)}
      </span>
    </div>
  );
}

FilterItem.propTypes = {
  onUpdateFilter: PropTypes.func.isRequired,
  onRemoveFilter: PropTypes.func.isRequired,
  topic: PropTypes.string,
  condition: PropTypes.string,
  query: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  forMyAlerts: PropTypes.bool,
  forwardedRef: PropTypes.oneOfType([
    PropTypes.func,
    // eslint-disable-next-line react/forbid-prop-types
    PropTypes.shape({ current: PropTypes.object }),
  ]),
};

FilterItem.defaultProps = {
  topic: '',
  condition: '',
  forMyAlerts: false,
  forwardedRef: null,
};

// eslint-disable-next-line react/jsx-props-no-spreading
const WrappedFilterItem = React.forwardRef((props, ref) => (<FilterItem {...props} forwardedRef={ref} />));

export default WrappedFilterItem;
