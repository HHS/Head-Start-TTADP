/** **
 *
 * TO DO
 *
 * 3) Fix date range picker interactions
 * 4) Polish the CSS (needs to match the mockup)
 * 5) Screen reader interaction test
 * 6) Everything else works, after that we just need unit tests!
 *
 * */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimesCircle, faCaretDown, faCaretUp,
} from '@fortawesome/free-solid-svg-icons';
import { v4 as uuidv4 } from 'uuid';
import DateRangeSelect from './DateRangeSelect';
import DatePicker from './FilterDatePicker';
import SpecialistSelect, { ROLES_MAP } from './SpecialistSelect';
import {
  DATE_CONDITIONS,
  FILTER_CONDITIONS,
  CUSTOM_DATE_RANGE,
  LAST_THIRTY_DAYS,
} from './constants';

import './FilterMenu.css';

const filterProp = PropTypes.shape({
  topic: PropTypes.string,
  condition: PropTypes.string,
  query: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
  id: PropTypes.string,
});

function FilterItem({ filter, onRemoveFilter, onUpdateFilter }) {
  const {
    id,
    topic,
    condition,
  } = filter;

  const [query, setQuery] = useState('');
  const [selectedDateRangeOption, updateSelectedDateRangeOption] = useState(LAST_THIRTY_DAYS);

  const onUpdate = (name, value) => {
    onUpdateFilter(id, name, value);
  };

  const onApplyDateRange = (selected) => {
    updateSelectedDateRangeOption(selected.value);
    onUpdate('query', selected.value);
  };

  const updateDateRange = (range) => {
    setQuery(range);
  };

  const updateSingleDate = (name, value) => {
    updateDateRange(value);
    onUpdate(name, value);
  };

  const renderDateRangeInput = () => {
    if (condition === 'Is within') {
      return (
        <DateRangeSelect
          selectedDateRangeOption={selectedDateRangeOption}
          onApply={onApplyDateRange}
          applied={selectedDateRangeOption}
          customDateRangeOption={CUSTOM_DATE_RANGE}
          dateRange={Array.isArray(query) ? '' : query}
          updateDateRange={updateDateRange}
          styleAsSelect
        />
      );
    }
    return (
      <span className="ttahub-filter-menu-single-date-picker display-flex margin-top-1 margin-left-1">
        <DatePicker query={Array.isArray(query) ? '' : query} onUpdateFilter={updateSingleDate} id="filter-date-picker" />
      </span>
    );
  };

  const onApplyRoles = (selected) => {
    const roleValues = selected.map((s) => parseInt(s, 10));

    const roles = ROLES_MAP.filter(
      (role) => roleValues.includes(role.selectValue),
    ).map((role) => role.value);

    setQuery(roles);
    onUpdate('query', roles);
  };

  const possibleFilters = [
    {
      id: 'programSpecialist',
      display: 'Specialist',
      conditions: FILTER_CONDITIONS,
      renderInput: () => <SpecialistSelect onApplyRoles={onApplyRoles} />,
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

  return (
    <li className="ttahub-filter-menu-item display-flex">
      <select
        name="topic"
        aria-label="topic"
        value={topic}
        onChange={(e) => onUpdate(e.target.name, e.target.value)}
        className="usa-select margin-right-1"
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
      <span className="margin-right-1">
        { selectedTopic
          ? selectedTopic.renderInput()
          : (<select className="usa-select ttahub-dummy-select margin-left-1" disabled aria-label="select a topic and condition first and then select a query" />)}
      </span>
      <button
        type="button"
        aria-label="remove filter"
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

function Menu({ filters, onApplyFilters, toggleMenu }) {
  const [items, setItems] = useState([...filters]);

  const onApply = () => {
    onApplyFilters(items);
  };

  const onRemoveFilter = (id) => {
    const newItems = [...items];
    const index = newItems.findIndex((item) => item.id === id);

    if (index !== -1) {
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  const onUpdateFilter = (id, name, value) => {
    const newItems = [...items];
    const toUpdate = newItems.find((item) => item.id === id);
    toUpdate[name] = value;

    if (name === 'topic') {
      toUpdate.query = '';
    }

    setItems(newItems);
  };
  const onAddFilter = () => {
    const newItems = [...items];
    const newItem = {
      id: uuidv4(),
      display: '',
      conditions: [],
      renderInput: () => <span />,
    };
    newItems.push(newItem);
    setItems(newItems);
  };

  return (
    <div className="ttahub-filter-menu-filters padding-2">
      <p><strong>Show results matching the following conditions.</strong></p>
      <div>
        <ul className="usa-list usa-list--unstyled">
          {items.map((filter) => (
            <FilterItem
              onRemoveFilter={onRemoveFilter}
              onUpdateFilter={onUpdateFilter}
              key={filter.id}
              filter={filter}
            />
          ))}
        </ul>
        <button type="button" className="usa-button usa-button--unstyled margin-top-1" onClick={onAddFilter}>Add new filter</button>
      </div>
      <div className="margin-top-1 display-flex flex-justify-end">
        <button type="button" className="usa-button usa-button--unstyled margin-right-2" onClick={toggleMenu}>Cancel</button>
        <button type="button" className="usa-button" onClick={onApply}>Apply filters</button>
      </div>
    </div>
  );
}

Menu.propTypes = {
  filters: PropTypes.arrayOf(filterProp).isRequired,
  onApplyFilters: PropTypes.func.isRequired,
  toggleMenu: PropTypes.func.isRequired,
};

export default function FilterMenu({ filters, onApplyFilters, allowedFilterTopics }) {
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const toggleMenu = () => setMenuIsOpen(!menuIsOpen);
  const changeableFilters = filters.filter((filter) => allowedFilterTopics.includes(filter.topic));

  return (
    <div className="ttahub-filter-menu margin-bottom-1">
      <button type="button" className="usa-button" onClick={toggleMenu}>
        Filters
        {' '}
        <FontAwesomeIcon className="margin-left-1" color="white" icon={menuIsOpen ? faCaretUp : faCaretDown} />
      </button>
      {
          menuIsOpen && (
          <Menu
            onApplyFilters={onApplyFilters}
            filters={changeableFilters}
            toggleMenu={toggleMenu}
          />
          )
      }
    </div>
  );
}

FilterMenu.propTypes = {
  filters: PropTypes.arrayOf(filterProp).isRequired,
  onApplyFilters: PropTypes.func.isRequired,
  allowedFilterTopics: PropTypes.arrayOf(PropTypes.string),
};

FilterMenu.defaultProps = {
  allowedFilterTopics: ['programSpecialist', 'startDate'],
};
