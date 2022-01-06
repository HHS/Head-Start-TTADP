import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import './FilterItem.css';

const filterProp = PropTypes.shape({
  topic: PropTypes.string,
  condition: PropTypes.string,
  query: PropTypes.oneOfType([
    PropTypes.string, PropTypes.arrayOf(PropTypes.string), PropTypes.number,
  ]),
  id: PropTypes.string,
});

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
  dateRangeOptions,
  errors,
  setErrors,
  index,
  validate,
  topicOptions,
  selectedTopic,
}) {
  const {
    id,
    topic,
    condition,
    query,
  } = filter;

  const fieldset = useRef();

  const setError = (message) => {
    const newErrors = [...errors];
    newErrors.splice(index, 1, message);
    setErrors(newErrors);
  };

  const onBlur = (e) => {
    let willValidate = true;

    // no validation if you are clicking on something within the filter item
    if (fieldset.current.contains(e.relatedTarget)) {
      willValidate = false;
    }

    // no validation if you are clicking on the cancel button
    if (e.relatedTarget && e.relatedTarget.getAttribute('aria-label') === 'discard changes and close filter menu') {
      willValidate = false;
    }

    if (willValidate) {
      const message = validate(filter);
      // if there is an error (either new or existing), we want to refresh
      // the validation message that's there
      if (message || errors[index]) {
        setError(message);
      }
    }
  };

  /**
   * changing the condition should clear the query
   * Having to do this, I set the default values to be empty where possible
   * since that creates the least complicated and confusing logic in the
   * function below
   */
  const onUpdate = (name, value) => {
    onUpdateFilter(id, name, value);
  };

  const DummySelect = () => (
    <select className="usa-select ttahub-dummy-select" disabled aria-label="select a topic and condition first and then select a query" />
  );

  const onApplyQuery = (q) => {
    onUpdate('query', q);
  };

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

  const fieldsetBaseClass = 'usa-form-group ttahub-filter-menu-item gap-1 desktop:display-flex padding-0 position-relative';
  let fieldsetErrorClass = '';

  switch (error) {
    case 'Please enter a value':
      fieldsetErrorClass = 'usa-form-group--error ttahub-filter-menu-item--error ttahub-filter-menu-item--error--value';
      break;
    case 'Please enter a condition':
      fieldsetErrorClass = 'usa-form-group--error ttahub-filter-menu-item--error ttahub-filter-menu-item--error--condition';
      break;
    case 'Please enter a filter':
      fieldsetErrorClass = 'usa-form-group--error ttahub-filter-menu-item--error ttahub-filter-menu-item--error--filter';
      break;
    default:
      break;
  }

  const fieldsetClassNames = `${fieldsetBaseClass} ${fieldsetErrorClass}`;
  const errorId = `error-message-${id}`;
  return (
    <div className={fieldsetClassNames} onBlur={onBlur} ref={fieldset}>
      {
        error
        && (
          <span className="usa-error-message padding-0 ttahub-filter-menu-error" id={errorId}>
            {error}
          </span>
        )
      }
      { /* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label className="sr-only" htmlFor={`topic-${id}`}>
        Select a filter
      </label>
      <select
        id={`topic-${id}`}
        name="topic"
        aria-label="topic"
        value={topic}
        onChange={(e) => onUpdate(e.target.name, e.target.value)}
        className="usa-select"
      >
        <option value="" disabled selected hidden>- Select -</option>
        {topicOptions}
      </select>
      { /* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label className="sr-only" htmlFor={`condition-${id}`}>
        Select a condition
      </label>
      <select
        id={`condition-${id}`}
        name="condition"
        aria-label="condition"
        value={condition}
        disabled={!topic}
        onChange={(e) => onUpdate(e.target.name, e.target.value)}
        className="usa-select"

      >
        <option value="" disabled selected hidden>- Select -</option>
        {conditions.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      { selectedTopic && condition
        ? selectedTopic.renderInput(
          id, // filter id
          condition, // filter condition
          query, // filter query
          onApplyQuery, // the on apply query function handler
          dateRangeOptions, // date range options, configurable per filter menu
        )
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
    </div>
  );
}

FilterItem.propTypes = {
  filter: filterProp.isRequired,
  onRemoveFilter: PropTypes.func.isRequired,
  onUpdateFilter: PropTypes.func.isRequired,
  dateRangeOptions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
    range: PropTypes.string,
  })).isRequired,
  errors: PropTypes.arrayOf(PropTypes.string).isRequired,
  setErrors: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
  validate: PropTypes.func.isRequired,
  topicOptions: PropTypes.arrayOf(PropTypes.node).isRequired,
  selectedTopic: PropTypes.shape({
    display: PropTypes.string,
    renderInput: PropTypes.func,
    conditions: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};
