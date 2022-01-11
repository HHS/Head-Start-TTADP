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
import FilterErrorContext from './FilterErrorContext';

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

  // filters currently selected. these will be excluded from filter selection
  const selectedFilters = items.map((filter) => filter.topic);

  // filters that aren't allowed per our allowedFilters prop
  const prohibitedFilters = AVAILABLE_FILTERS.filter((f) => !allowedFilters.includes(f));

  // If filters were changed outside of this component, we need to update the items
  // (for example, the "remove filter" button on the filter pills)
  useEffect(() => {
    setItems(filters);
  }, [filters]);

  // focus on the first topic if we add more
  useEffect(() => {
    if (items.length > itemLength) {
      const [topic] = Array.from(document.querySelectorAll('[name="topic"]')).slice(-1);

      if (topic && !topic.value) {
        topic.focus();
      }
    }
  }, [itemLength, items.length]);

  const totalValidation = () => {
    const hasErrors = errors.reduce((acc, curr) => {
      if (acc || curr) {
        return true;
      }

      return false;
    }, false);

    // return whether or not there are errors
    return !hasErrors;
  };

  const onApply = () => {
    // first, we validate
    if (!totalValidation()) {
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
      const newErrors = [...errors];
      newErrors.splice(index, 1);
      newItems.splice(index, 1);
      setItems(newItems);
      setErrors(newErrors);
    }
  };

  // reset state if we hit cancel
  const onCancel = () => {
    const copyOfFilters = filters.map((filter) => ({ ...filter }));
    setItems(copyOfFilters);
  };

  const onUpdateFilter = (id, name, value) => {
    const newItems = items.map((item) => ({ ...item }));
    const toUpdate = newItems.find((item) => item.id === id);

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
      } else {
        toUpdate.query = '';
      }
    }

    if (name === 'topic') {
      const f = FILTER_CONFIG.find(((config) => config.id === toUpdate.topic));
      const defaultQuery = f.defaultValues[value];

      toUpdate.condition = '';
      toUpdate.query = defaultQuery;
    }

    setItems(newItems);
  };

  const onAddFilter = () => {
    // validating will trigger any error states visually
    // and also prevent the adding of new items when previous ones are in error
    if (totalValidation()) {
      const newItems = [...items.map((item) => ({ ...item }))];
      const newItem = {
        id: uuidv4(),
        display: '',
        conditions: [],
      };
      newItems.push(newItem);

      const newErrors = [...errors, ''];
      setErrors(newErrors);

      setItems(newItems);
    }
  };

  const clearAllFilters = () => {
    setItems([]);
  };

  const canBlur = () => false;

  const ClearAllButton = () => <button type="button" onClick={clearAllFilters} className="usa-button usa-button--unstyled">Clear all filters</button>;

  const selectItems = items.filter((item) => !prohibitedFilters.includes(item.topic));
  const badFilters = [...selectedFilters, ...prohibitedFilters];
  const onOpen = () => {
    // The onOpen is passed into the DropdownMenu component
    // this will add an empty item into the list if there
    // are no filters, to cut down on user clicking
    if (!items.length) {
      onAddFilter();
    }
  };

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
      onOpen={onOpen}
    >

      <div className="ttahub-filter-menu-filters padding-x-3 padding-y-2">
        <p className="margin-bottom-2"><strong>Show results for the following filters.</strong></p>
        <div>
          <div className="margin-bottom-1">
            {selectItems.map((filter, index) => {
              const { topic } = filter;
              // this is some jujitsu
              const topicOptions = FILTER_CONFIG
                // filter out the bad topics
                .filter((config) => (
                  topic === config.id || !badFilters.includes(config.id)
                ))
                // return a new array of option elements
                .map(({ id: filterId, display }) => (
                  <option key={filterId} value={filterId}>{display}</option>
                ));

              const newTopic = {
                display: '',
                renderInput: () => {},
                conditions: [],
              };

              const selectedTopic = FILTER_CONFIG.find((f) => f.id === topic);

              const setError = (message) => {
                const newErrors = [...errors];
                newErrors.splice(index, 1, message);
                setErrors(newErrors);
              };

              return (
                <FilterErrorContext.Provider
                  key={filter.id}
                  value={{ setError, error: errors[index] }}
                >
                  <FilterItem
                    onRemoveFilter={onRemoveFilter}
                    onUpdateFilter={onUpdateFilter}
                    filter={filter}
                    errors={errors}
                    setErrors={setErrors}
                    topicOptions={topicOptions}
                    selectedTopic={selectedTopic || newTopic}
                  />
                </FilterErrorContext.Provider>
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
