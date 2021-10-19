import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './FilterMenu.css';

const filterProp = PropTypes.shape({
  topic: PropTypes.string,
  condition: PropTypes.string,
  query: PropTypes.string,
  id: PropTypes.string,
});

function Filter({ filter }) {
  return (
    <span>{filter.condition}</span>
  );
}

Filter.propTypes = {
  filter: filterProp.isRequired,
};

function Menu({ filters }) {
  return (
    <div className="ttahub-filter-menu-filters padding-2">
      <p><strong>Show results matching the following conditions.</strong></p>
      <div>
        <ul>
          {filters.map((filter) => <Filter key={filter.id} filter={filter} />)}
        </ul>
        <button type="button" className="usa-button usa-button--unstyled">Add new filter</button>
      </div>
      <div>
        <button type="button" className="usa-button usa-button--unstyled">Cancel</button>
        <button type="button" className="usa-button">Apply filters</button>
      </div>
    </div>
  );
}

Menu.propTypes = {
  filters: PropTypes.arrayOf(filterProp).isRequired,
};

export default function FilterMenu({ filters }) {
  const [menuIsOpen, setMenuIsOpen] = useState(false);

  const toggleMenu = () => setMenuIsOpen(!menuIsOpen);

  return (
    <div className="ttahub-filter-menu margin-bottom-1">
      <button type="button" className="usa-button" onClick={toggleMenu}>Filters</button>
      {
          menuIsOpen && <Menu filters={filters} />
      }
    </div>
  );
}

FilterMenu.propTypes = {
  filters: PropTypes.arrayOf(filterProp).isRequired,
};
