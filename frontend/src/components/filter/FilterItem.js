import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import FilterDateRange from './FilterDateRange';
import { formatDateRange } from '../DateRangeSelect';
import FilterSpecialistSelect from './FilterSpecialistSelect';
import {
  DATE_CONDITIONS,
  SELECT_CONDITIONS,
} from '../constants';
import './FilterItem.css';

const YEAR_TO_DATE = formatDateRange({
  yearToDate: true,
  forDateTime: true,
});

const filterProp = PropTypes.shape({
  topic: PropTypes.string,
  condition: PropTypes.string,
  query: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
  id: PropTypes.string,
});

const DEFAULT_VALUES = {
  startDate: { 'Is within': YEAR_TO_DATE, 'Is after': '', 'Is before': '' },
  role: { Contains: [], 'Does not contain': [] },
};

/**
 * The individual filter controls with the set of dropdowns
 *
 * @param {Object} props
 * @returns a JSX object
 */
export default function FilterItem({
  filter,
  onRemoveFilter,
  onUpdateFilter,
  errors,
  setErrors,
  index,
}) {
  const {
    id,
    topic,
    condition,
    query,

  } = filter;

  const li = useRef();

  const setError = (message) => {
    const newErrors = [...errors];
    newErrors.splice(index, 1, message);
    setErrors(newErrors);
  };

  const onBlur = (e) => {
    let message = '';

    if (li.current.contains(e.relatedTarget)) {
      return;
    }

    if (!topic) {
      message = 'Please enter a value';
      setError(message);
      return;
    }

    if (!condition) {
      message = 'Please enter a condition';
      setError(message);
      return;
    }

    if (!query || !query.length) {
      message = 'Please enter a parameter';
      setError(message);
      return;
    }

    setError(message);
  };

  /**
   * changing the condition should clear the query
   * Having to do this, I set the default values to be empty where possible
   * since that creates the least complicated and confusing logic in the
   * function below
   */
  const onUpdate = (name, value) => {
    if (name === 'condition') {
      // Set default value.
      const defaultQuery = DEFAULT_VALUES[topic][value];
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
      id: 'role',
      display: 'Specialist',
      conditions: SELECT_CONDITIONS,
      renderInput: () => (
        <FilterSpecialistSelect
          labelId={`role-${condition}-${id}`}
          onApplyRoles={onApplyQuery}
        />
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

  const error = errors[index];

  const liBaseClass = 'ttahub-filter-menu-item position-relative gap-1 desktop:display-flex';
  let liErrorClass = '';

  switch (error) {
    case 'Please enter a value':
      liErrorClass = 'ttahub-filter-menu-item--error ttahub-filter-menu-item--error--value';
      break;
    case 'Please enter a condition':
      liErrorClass = 'ttahub-filter-menu-item--error ttahub-filter-menu-item--error--condition';
      break;
    case 'Please enter a parameter':
      liErrorClass = 'ttahub-filter-menu-item--error ttahub-filter-menu-item--error--parameter';
      break;
    default:
      break;
  }

  const liClassNames = `${liBaseClass} ${liErrorClass}`;

  return (
    <li className={liClassNames} onBlur={onBlur} ref={li}>
      {
        error
        && (
        <span className="ttahub-filter-menu-error" role="status">
          <strong>{error}</strong>
        </span>
        )
      }
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
  errors: PropTypes.arrayOf(PropTypes.string).isRequired,
  setErrors: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
};
