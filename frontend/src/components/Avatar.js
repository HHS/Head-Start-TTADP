import React from 'react';
import PropTypes from 'prop-types';
import './Avatar.scss';

function Avatar({ name = '' }) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="avatar display-flex flex-align-center flex-justify-center">
      {initial}
    </div>
  );
}

Avatar.propTypes = {
  name: PropTypes.string.isRequired,
};

export default Avatar;
