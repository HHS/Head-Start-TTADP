import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';

import DateRangeSelect, { formatDateRange } from '../DateRangeSelect';
import DatePicker from '../FilterDatePicker';
import SpecialistSelect, { ROLES_MAP } from '../SpecialistSelect';
import {
  DATE_CONDITIONS,
  SELECT_CONDITIONS,
} from '../constants';

const filterProp = PropTypes.shape({
  topic: PropTypes.string,
  condition: PropTypes.string,
  query: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
  id: PropTypes.string,
});

/**
 * this date picker has bespoke date options
 */
const DATE_OPTIONS = [
  {
    label: 'Year to Date',
    value: 1,
    range: formatDateRange({ yearToDate: true, forDateTime: true }),
  },
  {
    label: 'Custom Date Range',
    value: 2,
    range: '',
  },
];

/**
 * The individual filter controls with the set of dropdowns
 *
 * @param {Object} props
 * @returns a JSX object
 */
export default function FilterItem({ filter, onRemoveFilter, onUpdateFilter }) {
  const {
    id,
    topic,
    condition,
    query,
  } = filter;

  const firstSelect = useRef();

  useEffect(() => {
    if (firstSelect.current) {
      firstSelect.current.focus();
    }
  });

  const onUpdate = (name, value) => {
    onUpdateFilter(id, name, value);
  };

  const DummySelect = () => (
    <span className="margin-x-1"><select className="usa-select ttahub-dummy-select" disabled aria-label="select a topic and condition first and then select a query" /></span>
  );

  const onApplyDateRange = (range) => {
    onUpdate('query', range);
  };

  const updateSingleDate = (name, value) => {
    onUpdate(name, value);
  };

  const renderDateRangeInput = () => {
    if (condition === 'Is within') {
      return (
        <span className="margin-right-1">
          <DateRangeSelect
            options={DATE_OPTIONS}
            updateDateRange={onApplyDateRange}
            styleAsSelect
          />
        </span>
      );
    }
    return (
      <span className="ttahub-filter-menu-single-date-picker display-flex margin-top-1 margin-x-1">
        <DatePicker query={Array.isArray(query) ? '' : query} onUpdateFilter={updateSingleDate} id="filter-date-picker" />
      </span>
    );
  };

  const onApplyRoles = (selected) => {
    const roleValues = selected.map((s) => parseInt(s, 10));

    const roles = ROLES_MAP.filter(
      (role) => roleValues.includes(role.selectValue),
    ).map((role) => role.value);

    onUpdate('query', roles);
  };

  const possibleFilters = [
    {
      id: 'role',
      display: 'Specialist',
      conditions: SELECT_CONDITIONS,
      renderInput: () => (
        <span className="margin-right-1">
          <SpecialistSelect
            onApplyRoles={onApplyRoles}
          />
        </span>
      ),
    },
    {
      id: 'startDate',
      display: 'Date range',
      conditions: DATE_CONDITIONS,
      renderInput: () => renderDateRangeInput(),
    },
  ];

  const selectedTopic = possibleFilters.find((f) => f.id === topic);
  const conditions = selectedTopic ? selectedTopic.conditions : [];

  const onRemove = () => {
    onRemoveFilter(id);
  };

  let readableFilterName = '';
  if (selectedTopic) {
    readableFilterName = selectedTopic.display;
  }

  const buttonAriaLabel = readableFilterName
    ? `remove ${readableFilterName} ${condition} ${query} filter. click apply filters to make your changes`
    : 'remove this filter. click apply filters to make your changes';

  return (
    <li className="ttahub-filter-menu-item display-flex">
      <select
        name="topic"
        aria-label="topic"
        value={topic}
        onChange={(e) => onUpdate(e.target.name, e.target.value)}
        className="usa-select margin-right-1"
        ref={firstSelect}
      >
        <option value="">- Select -</option>
        {possibleFilters.map(({ id: filterId, display }) => (
          <option key={filterId} value={filterId}>{display}</option>
        ))}
      </select>
      <select
        name="condition"
        aria-label="condition"
        value={condition}
        onChange={(e) => onUpdate(e.target.name, e.target.value)}
        className="usa-select"
      >
        <option value="">- Select -</option>
        {conditions.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      { selectedTopic && condition
        ? selectedTopic.renderInput()
        : <DummySelect /> }
      <button
        type="button"
        aria-label={buttonAriaLabel}
        className="usa-button usa-button--unstyled font-sans-xs margin-right-1 margin-left-0"
        onClick={onRemove}
      >
        <FontAwesomeIcon color="gray" icon={faTimesCircle} />
      </button>
    </li>
  );
}

FilterItem.propTypes = {
  filter: filterProp.isRequired,
  onRemoveFilter: PropTypes.func.isRequired,
  onUpdateFilter: PropTypes.func.isRequired,
};
