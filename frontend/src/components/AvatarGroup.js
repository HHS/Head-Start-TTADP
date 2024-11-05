import React from 'react';
import PropTypes from 'prop-types';
import Avatar from './Avatar';

const AvatarGroup = ({ userName, className }) => (
  <h2 className={`margin-0 display-flex flex-align-center border-bottom border-gray-10 ${className}`}>
    <Avatar name={userName} />
    <span className="margin-left-2 font-sans-xs">
      {userName}
    </span>
  </h2>
);

AvatarGroup.propTypes = {
  userName: PropTypes.string.isRequired,
  className: PropTypes.string,
};

AvatarGroup.defaultProps = {
  className: 'padding-2',
};

export default AvatarGroup;
