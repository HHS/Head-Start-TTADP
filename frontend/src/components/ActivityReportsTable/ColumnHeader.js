/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import PropTypes from 'prop-types';

function ColumnHeader({
  displayName, name, sortBy, sortDirection, onUpdateSort,
}) {
  const getClassNamesFor = (n) => (sortBy === n ? sortDirection : '');
  const sortClassName = getClassNamesFor(name);
  let fullAriaSort;
  switch (sortClassName) {
    case 'asc':
      fullAriaSort = 'ascending';
      break;
    case 'desc':
      fullAriaSort = 'descending';
      break;
    default:
      fullAriaSort = 'none';
      break;
  }

  return (
    <th scope="col" aria-sort={fullAriaSort}>
      <a
        role="button"
        tabIndex={0}
        onClick={() => onUpdateSort(name)}
        onKeyPress={() => onUpdateSort(name)}
        className={`sortable ${sortClassName}`}
        aria-label={`${displayName}. Activate to sort ${sortClassName === 'asc' ? 'descending' : 'ascending'}`}
      >
        {displayName}
      </a>
    </th>
  );
}

ColumnHeader.propTypes = {
  displayName: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortDirection: PropTypes.string.isRequired,
  onUpdateSort: PropTypes.func.isRequired,
};

export default ColumnHeader;
