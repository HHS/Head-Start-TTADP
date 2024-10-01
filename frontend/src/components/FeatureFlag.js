import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Redirect } from 'react-router-dom';
import UserContext from '../UserContext';
import isAdmin from '../permissions';

export default function FeatureFlag({
  flag, renderNotFound, children,
}) {
  const { user } = useContext(UserContext);
  const admin = isAdmin(user);

  if (!admin && user.flags && !user.flags.includes(flag)) {
    if (renderNotFound) {
      return <Redirect to="/something-went-wrong/404" />;
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
