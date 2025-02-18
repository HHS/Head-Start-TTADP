import React from 'react';
import PropTypes from 'prop-types';
import './Avatar.scss';

function Avatar({ name }) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      data-testid="avatar"
      className="avatar display-flex flex-align-center flex-justify-center circle-5 text-white"
    >
      {initial}
    </div>
  );
}

Avatar.propTypes = {
  name: PropTypes.string.isRequired,
};

export default Avatar;
