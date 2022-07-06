import React from 'react';
import PropTypes from 'prop-types';

export default function List({ list, className }) {
  return (
    <ul className={`usa-list usa-list--unstyled ${className}`}>
      {list.map((item) => (
        <li key={item}>
          {item}
        </li>
      ))}
    </ul>
  );
}

List.propTypes = {
  list: PropTypes.arrayOf(PropTypes.string).isRequired,
  className: PropTypes.string.isRequired,
};
