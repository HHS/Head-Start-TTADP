import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimesCircle, faCaretDown, faCaretUp,
} from '@fortawesome/free-solid-svg-icons';
import { v4 as uuidv4 } from 'uuid';
import DateRangeSelect, { formatDateRange } from './DateRangeSelect';
import DatePicker from './FilterDatePicker';
import SpecialistSelect, { ROLES_MAP } from './SpecialistSelect';
import {
  DATE_CONDITIONS,
  FILTER_CONDITIONS,
  CUSTOM_DATE_RANGE,
} from './constants';

import './FilterMenu.css';
import { ESCAPE_KEY_CODE } from '../Constants';

/**
 * this date picker has bespoke date options
 */
const DATE_OPTIONS = [
  {
    label: 'Year to Date',
    value: 1,
  },
  {
    label: 'Custom Date Range',
    value: 2,
  },
];

// store this for later
const YEAR_TO_DATE_OPTION = DATE_OPTIONS[0].value;

// save this to cut down on repeated boilerplate in PropTypes
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
function FilterItem({ filter, onRemoveFilter, onUpdateFilter }) {
  const {
    id,
    topic,
    condition,
    query,
  } = filter;

  const [selectedDateRangeOption, updateSelectedDateRangeOption] = useState(YEAR_TO_DATE_OPTION);

  const onUpdate = (name, value) => {
    onUpdateFilter(id, name, value);
  };

  const DummySelect = () => (
    <span className="margin-x-1"><select className="usa-select ttahub-dummy-select" disabled aria-label="select a topic and condition first and then select a query" /></span>
  );

  const onApplyDateRange = (selected, range) => {
    if (selected.value === YEAR_TO_DATE_OPTION) {
      const yearToDate = formatDateRange({
        yearToDate: true,
        forDateTime: true,
      });
      onUpdate('query', yearToDate);
    } else {
      onUpdate('query', range);
    }
    updateSelectedDateRangeOption(selected.value);
  };

  const updateSingleDate = (name, value) => {
    onUpdate(name, value);
  };

  const renderDateRangeInput = () => {
    if (condition === 'Is within') {
      return (
        <span className="margin-right-1">
          <DateRangeSelect
            selectedDateRangeOption={selectedDateRangeOption}
            onApply={onApplyDateRange}
            applied={selectedDateRangeOption}
            customDateRangeOption={CUSTOM_DATE_RANGE}
            dateRange={Array.isArray(query) ? '' : query}
            styleAsSelect
            options={DATE_OPTIONS}
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
      conditions: FILTER_CONDITIONS,
      renderInput: () => (
        <span className="margin-right-1">
          <SpecialistSelect
            onApplyRoles={onApplyRoles}
            initialValues={query}
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
      { selectedTopic && condition
        ? selectedTopic.renderInput()
        : <DummySelect /> }
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

/**
 * Renders the interior of the menu, the set of FilterItems
 * @param {Object} props
 * @returns JSX Object
 */
function Menu({
  filters, onApplyFilters, toggleMenu, hidden,
}) {
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

  const closeOnEsc = (e) => {
    if (hidden) {
      return;
    }

    if (e.keyCode === ESCAPE_KEY_CODE) {
      toggleMenu(false);
    }
  };

  return (
    <div role="menu" tabIndex="-1" className="ttahub-filter-menu-filters padding-x-5 padding-y-2 shadow-2" hidden={hidden} onKeyDown={closeOnEsc}>
      <p className="margin-bottom-2"><strong>Show results matching the following conditions.</strong></p>
      <div>
        <ul className="usa-list usa-list--unstyled margin-bottom-1">
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
      <div className="margin-top-1 display-flex flex-justify-end margin-right-3">
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
  hidden: PropTypes.bool.isRequired,
};

/**
 * Renders the entire filter menu and contains the logic for toggling it's visibility
 * @param {Object} props
 * @returns JSX Object
 */
export default function FilterMenu({ filters, onApplyFilters }) {
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const toggleMenu = () => setMenuIsOpen(!menuIsOpen);

  return (
    <div className="ttahub-filter-menu margin-bottom-3">
      <button type="button" className="usa-button" onClick={toggleMenu}>
        Filters
        {' '}
        <FontAwesomeIcon className="margin-left-1" color="white" icon={menuIsOpen ? faCaretUp : faCaretDown} />
      </button>
      <Menu
        onApplyFilters={onApplyFilters}
        filters={filters}
        toggleMenu={toggleMenu}
        hidden={!menuIsOpen}
      />
    </div>
  );
}

FilterMenu.propTypes = {
  filters: PropTypes.arrayOf(filterProp).isRequired,
  onApplyFilters: PropTypes.func.isRequired,
};
