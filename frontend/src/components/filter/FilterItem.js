import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import FilterDateRange from './FilterDateRange';
import SpecialistSelect from '../SpecialistSelect';
import {
  DATE_CONDITIONS,
  SELECT_CONDITIONS,
} from '../constants';

import './FilterItem.css';

const filterProp = PropTypes.shape({
  topic: PropTypes.string,
  condition: PropTypes.string,
  query: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
  id: PropTypes.string,
});

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

  const onUpdate = (name, value) => {
    onUpdateFilter(id, name, value);
  };

  const DummySelect = () => (
    <span className="margin-x-1"><select className="usa-select ttahub-dummy-select" disabled aria-label="select a topic and condition first and then select a query" /></span>
  );

  const onApplyQuery = (q) => {
    onUpdate('query', q);
  };

  const updateSingleDate = (name, value) => {
    onUpdate(name, value);
  };

  const possibleFilters = [
    {
      id: 'role',
      display: 'Specialist',
      conditions: SELECT_CONDITIONS,
      renderInput: () => (
        <span className="margin-right-1">
          <SpecialistSelect
            onApplyRoles={onApplyQuery}
          />
        </span>
      ),
    },
    {
      id: 'startDate',
      display: 'Date range',
      conditions: DATE_CONDITIONS,
      renderInput: () => (
        <FilterDateRange
          condition={condition}
          query={query}
          updateSingleDate={updateSingleDate}
          onApplyDateRange={onApplyQuery}
        />
      ),
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
      >
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
