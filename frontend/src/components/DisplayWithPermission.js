import PropTypes from 'prop-types';
import React, { useContext } from 'react';
import { Redirect } from 'react-router';
import isAdmin from '../permissions';
import UserContext from '../UserContext';

export default function DisplayWithPermission({ scopes, renderNotFound, children }) {
  const { user } = useContext(UserContext);
  const admin = isAdmin(user);

  const userScopes = (user.permissions || []).map((p) => p.scopeId);

  const userHasScope = scopes.some((scope) => userScopes.includes(scope));

  if (!admin && !userHasScope) {
    if (renderNotFound) {
      return <Redirect to="/something-went-wrong/404" />;
    }
    return <></>;
  }
  return children;
}

DisplayWithPermission.propTypes = {
  scopes: PropTypes.arrayOf(PropTypes.number),
  renderNotFound: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

DisplayWithPermission.defaultProps = {
  renderNotFound: false,
  scopes: [],
};
