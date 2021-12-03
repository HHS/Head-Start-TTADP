import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import FilterDateRange from './FilterDateRange';

import SpecialistSelect from '../SpecialistSelect';
import FilterRegionalSelect from './FilterRegionSelect';
import {
  DATE_CONDITIONS,
  SELECT_CONDITIONS,
} from '../constants';
import './FilterItem.css';
import FilterInput from './FilterInput';
import FilterReasonSelect from './FilterReasonSelect';
import FilterPopulationSelect from './FilterPopulationSelect';

import { FILTER_CONFIG } from './constants';

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

  /**
   * changing the condition should clear the query
   * Having to do this, I set the default values to be empty where possible
   * since that creates the least complicated and confusing logic in the
   * function below
   */
  const onUpdate = (name, value) => {
    if (name === 'condition') {
      /**
       * if the condition is changed, we need to do a lookup in the filter config
       * and set the query to the new default value
       */
      const f = FILTER_CONFIG.find(((config) => config.id === topic));
      const defaultQuery = f.defaultValues[value];

      onUpdateFilter(id, 'query', defaultQuery);
    }

    onUpdateFilter(id, name, value);
  };

  const DummySelect = () => (
    <select className="usa-select ttahub-dummy-select" disabled aria-label="select a topic and condition first and then select a query" />
  );

  const onApplyQuery = (q) => {
    onUpdate('query', q);
  };

  const updateSingleDate = (name, value) => {
    onUpdate(name, value);
  };

  const possibleFilters = [
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
    {
      id: 'programSpecialist',
      display: 'Program Specialist',
      conditions: SELECT_CONDITIONS,
      renderInput: () => (
        <FilterInput
          query={query}
          onApply={onApplyQuery}
        />
      ),
    },
    {
      id: 'reason',
      display: 'Reason',
      conditions: SELECT_CONDITIONS,
      renderInput: () => (
        <FilterReasonSelect
          labelId={`reason-${condition}-${id}`}
          onApply={onApplyQuery}
        />
      ),
    },
    {
      id: 'region',
      display: 'Region',
      conditions: SELECT_CONDITIONS,
      renderInput: () => (
        <FilterRegionalSelect
          appliedRegion={query}
          onApply={onApplyQuery}
        />
      ),
    },
    {
      id: 'role',
      display: 'Role',
      conditions: SELECT_CONDITIONS,
      renderInput: () => (
        <SpecialistSelect
          labelId={`role-${condition}-${id}`}
          onApplyRoles={onApplyQuery}
          toggleAllInitial={false}
          hideToggleAll
        />
      ),
    },
    {
      id: 'targetPopulation',
      display: 'Target Population',
      conditions: SELECT_CONDITIONS,
      renderInput: () => (
        <FilterPopulationSelect
          labelId={`population-${condition}-${id}`}
          onApply={onApplyQuery}
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
    <li className="ttahub-filter-menu-item gap-1 desktop:display-flex">
      { /* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label className="sr-only" htmlFor={`topic-${id}`}>
        Select a filter topic
      </label>
      <select
        id={`topic-${id}`}
        name="topic"
        aria-label="topic"
        value={topic}
        onChange={(e) => onUpdate(e.target.name, e.target.value)}
        className="usa-select"
      >
        <option value="">Select a topic</option>
        {possibleFilters.map(({ id: filterId, display }) => (
          <option key={filterId} value={filterId}>{display}</option>
        ))}
      </select>
      { /* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label className="sr-only" htmlFor={`condition-${id}`}>
        Select a filter condition
      </label>
      <select
        id={`condition-${id}`}
        name="condition"
        aria-label="condition"
        value={condition}
        onChange={(e) => onUpdate(e.target.name, e.target.value)}
        className="usa-select"
      >
        <option value="">Select a condition</option>
        {conditions.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      { selectedTopic && condition
        ? selectedTopic.renderInput()
        : <DummySelect /> }
      <button
        type="button"
        aria-label={buttonAriaLabel}
        className="ttahub-filter-menu-item-close-buttom usa-button usa-button--unstyled font-sans-xs desktop:margin-x-1 margin-top-1 desktop:margin-bottom-0 margin-bottom-4"
        onClick={onRemove}
      >
        <span className="desktop:display-none margin-right-1">Remove filter</span>
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
