import React from 'react';
import PropTypes from 'prop-types';
import NotFound from '../pages/NotFound';

export default function FeatureFlag({
  user, flag, admin, renderNotFound, children,
}) {
  if (!admin && user.flags && !user.flags.includes(flag)) {
    if (renderNotFound) {
      return <NotFound />;
    }
    return <></>;
  }
  return children;
}

FeatureFlag.propTypes = {
  flag: PropTypes.string.isRequired,
  admin: PropTypes.bool.isRequired,
  user: PropTypes.shape({
    flags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  renderNotFound: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

FeatureFlag.defaultProps = {
  renderNotFound: false,
};
