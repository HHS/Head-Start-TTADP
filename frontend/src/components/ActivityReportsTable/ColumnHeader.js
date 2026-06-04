import PropTypes from 'prop-types';
import React from 'react';

export const getClassNamesFor = (n, sortBy, sortDirection) => (sortBy === n ? sortDirection : '');

function ColumnHeader({ displayName, name, sortBy, sortDirection, onUpdateSort }) {
  const sortClassName = getClassNamesFor(name, sortBy, sortDirection);
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
<<<<<<< HEAD
      <a
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          onUpdateSort(name);
        }}
        onKeyPress={(e) => {
          e.preventDefault();
          onUpdateSort(name);
        }}
=======
      <button
        type="button"
        onClick={() => onUpdateSort(name)}
>>>>>>> main
        className={`sortable ${sortClassName}`}
        aria-label={`${displayName}. Activate to sort ${sortClassName === 'asc' ? 'descending' : 'ascending'}`}
      >
        {displayName}
      </button>
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
