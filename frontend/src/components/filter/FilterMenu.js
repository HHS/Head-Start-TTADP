import React, {
  useState,
  useEffect,
} from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import DropdownMenu from '../DropdownMenu';
import FilterItem from './FilterItem';
import { FILTER_CONFIG, AVAILABLE_FILTERS } from './constants';

import usePrevious from '../../hooks/usePrevious';
import { filterProp } from './props';

/**
 * Renders the entire filter menu and contains the logic for toggling it's visibility
 * @param {Object} props
 * @returns JSX Object
 */
export default function FilterMenu({
  filters, onApplyFilters, allowedFilters, applyButtonAria,
}) {
  const [items, setItems] = useState([...filters.map((filter) => ({ ...filter }))]);
  const [errors, setErrors] = useState(filters.map(() => ''));

  const itemLength = usePrevious(items.length);

  const validate = ({ topic, query, condition }) => {
    if (!topic) {
      return 'Please enter a filter';
    }

    if (!condition) {
      return 'Please enter a condition';
    }

    if (!query || !query.toString().length) {
      return 'Please enter a value';
    }

    if (query.toString().includes('Invalid date') || (topic === 'startDate' && query.toString() === '-')) {
      return 'Please enter a value';
    }

    return '';
  };

  // filters currently selected. these will be excluded from filter selection
  const selectedFilters = items.map((filter) => filter.topic);

  // filters that aren't allowed per our allowedFilters prop
  const prohibitedFilters = AVAILABLE_FILTERS.filter((f) => !allowedFilters.includes(f));

  // If filters were changed outside of this component, we need to update the items
  // (for example, the "remove filter" button on the filter pills)
  useEffect(() => {
    setItems(filters);
  }, [filters]);

  // if an item was deleted, we need to update the errors
  useEffect(() => {
    if (items.length < errors.length) {
      setErrors(items.map(() => ''));
    }
  }, [errors.length, items]);

  // focus on the first topic if we add more
  useEffect(() => {
    if (items.length > itemLength) {
      const [topic] = Array.from(document.querySelectorAll('[name="topic"]')).slice(-1);

      if (topic && !topic.value) {
        topic.focus();
      }
    }
  }, [itemLength, items.length]);

  const onApply = () => {
    // first, we validate
    const hasErrors = items.reduce((acc, curr, index) => {
      if (acc) {
        return true;
      }

      const setError = (message) => {
        const newErrors = [...errors];
        newErrors.splice(index, 1, message);
        setErrors(newErrors);
      };

      const message = validate(curr);

      if (message) {
        setError(message);
        return true;
      }

      return false;
    }, false);

    // if validation was not successful
    if (hasErrors) {
      return false;
    }

    // otherwise, we apply
    onApplyFilters(items);
    return true;
  };

  const onRemoveFilter = (id) => {
    const newItems = items.map((item) => ({ ...item }));
    const index = newItems.findIndex((item) => item.id === id);

    if (index !== -1) {
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  // reset state if we hit cancel
  const onCancel = () => {
    const copyOfFilters = filters.map((filter) => ({ ...filter }));
    setItems(copyOfFilters);
  };

  const onUpdateFilter = (id, name, value) => {
    //
    // just an array spread creates a new
    // array of references... to the same objects as before
    // therefore, this function was mutating state in unexpected ways
    //
    // hence this real humdinger of a line of javascript
    const newItems = items.map((item) => ({ ...item }));
    const toUpdate = newItems.find((item) => item.id === id);

    // and here is the key to all the problems
    // the (preventing of) infinite updating itself
    if (toUpdate[name] === value) {
      return;
    }

    toUpdate[name] = value;

    if (name === 'condition') {
      /**
       * if the condition is changed, we need to do a lookup in the filter config
       * and set the query to the new default value
       */
      const f = FILTER_CONFIG.find(((config) => config.id === toUpdate.topic));
      const defaultQuery = f.defaultValues[value];

      if (defaultQuery) {
        toUpdate.query = defaultQuery;
      }
    }

    if (name === 'topic') {
      toUpdate.condition = '';
      toUpdate.query = '';
    }

    setItems(newItems);
  };

  const onAddFilter = () => {
    const newItems = [...items.map((item) => ({ ...item }))];
    const newItem = {
      id: uuidv4(),
      display: '',
      conditions: [],
    };
    newItems.push(newItem);
    setItems(newItems);
  };

  const clearAllFilters = () => {
    setItems([]);
  };

  const canBlur = () => false;

  const ClearAllButton = () => <button type="button" onClick={clearAllFilters} className="usa-button usa-button--unstyled">Clear all filters</button>;

  const selectItems = items.filter((item) => !prohibitedFilters.includes(item.topic));

  return (
    <DropdownMenu
      buttonText="Filters"
      buttonAriaLabel="open filters for this page"
      onApply={onApply}
      applyButtonAria={applyButtonAria}
      showCancel
      onCancel={onCancel}
      cancelAriaLabel="discard changes and close filter menu"
      className="ttahub-filter-menu margin-right-1"
      menuName="filter menu"
      canBlur={canBlur}
      AlternateActionButton={ClearAllButton}
    >
      <div className="ttahub-filter-menu-filters padding-x-3 padding-y-2">
        <p className="margin-bottom-2"><strong>Show results for the following filters.</strong></p>
        <div>
          <div className="margin-bottom-1">
            {selectItems.map((filter, index) => {
              const { topic } = filter;

              // this is some jujitsu
              const topicOptions = FILTER_CONFIG.filter((config) => (
                topic === config.id
                || ![...selectedFilters, ...prohibitedFilters].includes(config.id)
              )).map(({ id: filterId, display }) => (
                <option key={filterId} value={filterId}>{display}</option>
              ));

              const newTopic = {
                display: '',
                renderInput: () => {},
                conditions: [],
              };

              const selectedTopic = FILTER_CONFIG.find((f) => f.id === topic);

              return (
                <FilterItem
                  onRemoveFilter={onRemoveFilter}
                  onUpdateFilter={onUpdateFilter}
                  key={filter.id}
                  filter={filter}
                  errors={errors}
                  setErrors={setErrors}
                  validate={validate}
                  index={index}
                  topicOptions={topicOptions}
                  selectedTopic={selectedTopic || newTopic}
                />
              );
            })}
          </div>
          <button type="button" className="usa-button usa-button--outline margin-top-1" onClick={onAddFilter}>Add new filter</button>
        </div>
      </div>

    </DropdownMenu>
  );
}

FilterMenu.propTypes = {
  filters: PropTypes.arrayOf(filterProp).isRequired,
  onApplyFilters: PropTypes.func.isRequired,
  allowedFilters: PropTypes.arrayOf(PropTypes.string),
  applyButtonAria: PropTypes.string.isRequired,
};

FilterMenu.defaultProps = {
  allowedFilters: AVAILABLE_FILTERS,
};
