import React, {
  useState,
  useEffect,
} from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import DropdownMenu from '../DropdownMenu';
import FilterItem from './FilterItem';
import { getStateCodes } from '../../fetchers/users';
import { FILTER_CONFIG, AVAILABLE_FILTERS } from './constants';
import { formatDateRange } from '../DateRangeSelect';
import usePrevious from '../../hooks/usePrevious';
import { filterProp } from './props';

/**
 * Renders the entire filter menu and contains the logic for toggling it's visibility
 * @param {Object} props
 * @returns JSX Object
 */

export default function FilterMenu({
  filters, onApplyFilters, allowedFilters, dateRangeOptions, applyButtonAria,
}) {
  const [items, setItems] = useState([...filters.map((filter) => ({ ...filter }))]);
  const [errors, setErrors] = useState(filters.map(() => ''));
  const [stateCodes, setStateCodes] = useState([]);

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

  // fetch state codes for user
  useEffect(() => {
    async function fetchStateCodes() {
      try {
        const codes = await getStateCodes();
        setStateCodes(codes);
      } catch (error) {
        // fail silently
      }
    }

    fetchStateCodes();
  }, []);

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
            {items.map((filter, index) => {
              const { topic } = filter;

              if (prohibitedFilters.includes(topic)) {
                return null;
              }

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
                  dateRangeOptions={dateRangeOptions}
                  errors={errors}
                  setErrors={setErrors}
                  validate={validate}
                  index={index}
                  topicOptions={topicOptions}
                  stateCodes={stateCodes}
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
  dateRangeOptions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
    range: PropTypes.string,
  })),
  applyButtonAria: PropTypes.string.isRequired,
};

FilterMenu.defaultProps = {
  allowedFilters: AVAILABLE_FILTERS,
  dateRangeOptions: [
    {
      label: 'Year to date',
      value: 1,
      range: formatDateRange({ yearToDate: true, forDateTime: true }),
    },
    {
      label: 'Custom date range',
      value: 2,
      range: '',
    },
  ],
};
