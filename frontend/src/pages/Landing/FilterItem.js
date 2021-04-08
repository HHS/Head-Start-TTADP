/* eslint-disable max-len */
import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import {
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons';

import './Filter.css';
import DatePicker from './Components/DatePicker';
import DateRangePicker from './Components/DateRangePicker';
import FilterInput from './Components/FilterInput';

import {
  SELECT_CONDITIONS,
  DATE_CONDITIONS,
  WITHIN,
} from './constants';

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

const possibleFilters = [
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
    id: 'topic',
    display: 'Topic',
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
    id: 'lastSaved',
    display: 'Last saved',
    conditions: DATE_CONDITIONS,
    renderInput: dateInput,
  },
];

export default function FilterItem({
  topic,
  condition,
  query,
  onUpdateFilter,
  onRemoveFilter,
  id,
}) {
  const selectedTopic = possibleFilters.find((filter) => filter.id === topic);
  const conditions = selectedTopic ? selectedTopic.conditions : [];
  const showQuery = selectedTopic && condition;

  return (
    <div className="margin-top-1 smart-hub--filter smart-hub--filter-item">
      <Button
        type="button"
        unstyled
        aria-label="remove filter"
        className="margin-right-1 smart-hub--filter-button"
        onClick={onRemoveFilter}
      >
        <FontAwesomeIcon color="gray" icon={faTimesCircle} />
      </Button>
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
};

FilterItem.defaultProps = {
  topic: '',
  condition: '',
};
