import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import NotFound from '../pages/NotFound';
import UserContext from '../UserContext';
import isAdmin from '../permissions';

export default function FeatureFlag({
  flag, renderNotFound, children,
}) {
  const { user } = useContext(UserContext);
  const admin = isAdmin(user);

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
  renderNotFound: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

FeatureFlag.defaultProps = {
  renderNotFound: false,
};
