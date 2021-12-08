import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import DropdownMenu from '../DropdownMenu';
import FilterItem from './FilterItem';
import { FILTER_CONFIG } from './constants';

// save this to cut down on repeated boilerplate in PropTypes
const filterProp = PropTypes.shape({
  topic: PropTypes.string,
  condition: PropTypes.string,
  query: PropTypes.oneOfType([
    PropTypes.string, PropTypes.arrayOf(PropTypes.string), PropTypes.number,
  ]),
  id: PropTypes.string,
});

// a list of all the filter topics available
const availableFilters = FILTER_CONFIG.map((f) => f.id);

/**
 * Renders the entire filter menu and contains the logic for toggling it's visibility
 * @param {Object} props
 * @returns JSX Object
 */
export default function FilterMenu({ filters, onApplyFilters, allowedFilters }) {
  const [items, setItems] = useState([...filters]);

  // filters currently selected. these will be excluded from filter selection
  const selectedFilters = items.map((filter) => filter.topic);

  const prohibitedFilters = [
    ...selectedFilters,
    ...availableFilters.filter((f) => !allowedFilters.includes(f)),
  ];

  useEffect(() => {
    // If filters where changes outside of this component update.
    setItems(filters);
  }, [filters]);

  const onApply = () => {
    // we only apply filters that have all the thingys filled out (technical term)
    onApplyFilters(items.filter((item) => item.topic && item.condition && item.query));
  };

  const onRemoveFilter = (id) => {
    const newItems = [...items];
    const index = newItems.findIndex((item) => item.id === id);

    if (index !== -1) {
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  // reset state if we hit cancel
  const onCancel = () => setItems([...filters]);

  const onUpdateFilter = (id, name, value, toggleAllChecked) => {
    const newItems = [...items];
    const toUpdate = newItems.find((item) => item.id === id);
    toUpdate[name] = value;

    if (name === 'topic') {
      toUpdate.condition = '';
      toUpdate.query = '';
    }
    toUpdate.toggleAllChecked = toggleAllChecked;
    setItems(newItems);
  };

  const onAddFilter = () => {
    const newItems = [...items];
    const newItem = {
      id: uuidv4(),
      display: '',
      conditions: [],
      toggleAllChecked: true,
    };
    newItems.push(newItem);
    setItems(newItems);
  };

  const clearAllFilters = () => {
    setItems([]);
  };

  const canBlur = () => false;

  const ClearAllButton = <button type="button" onClick={clearAllFilters} className="usa-button usa-button--unstyled">Clear all filters</button>;

  return (
    <DropdownMenu
      buttonText="Filters"
      buttonAriaLabel="open filters for this page"
      onApply={onApply}
      applyButtonAria="apply filters to grantee record data"
      showCancel
      onCancel={onCancel}
      cancelAriaLabel="discard changes and close filter menu"
      className="ttahub-filter-menu margin-right-1"
      menuName="filter menu"
      canBlur={canBlur}
      alternateActionButton={ClearAllButton}
    >
      <div className="ttahub-filter-menu-filters padding-x-3 padding-y-2">
        <p className="margin-bottom-2"><strong>Show results matching the following conditions.</strong></p>
        <div>
          <ul className="usa-list usa-list--unstyled margin-bottom-1">
            {items.map((filter) => (
              <FilterItem
                onRemoveFilter={onRemoveFilter}
                onUpdateFilter={onUpdateFilter}
                key={filter.id}
                filter={filter}
                prohibitedFilters={prohibitedFilters}
              />
            ))}
          </ul>
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
};

FilterMenu.defaultProps = {
  allowedFilters: availableFilters,
};
