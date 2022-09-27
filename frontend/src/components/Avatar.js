import React from 'react';
import PropTypes from 'prop-types';
import './Avatar.scss';

function Avatar({ name }) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      data-testid="avatar"
      className="avatar display-flex flex-align-center flex-justify-center height-5 minh-5 width-5 minw-5 text-white padding-0 border-0 radius-pill"
    >
      {initial}
    </div>
  );
}

Avatar.propTypes = {
  name: PropTypes.string.isRequired,
};

export default Avatar;
