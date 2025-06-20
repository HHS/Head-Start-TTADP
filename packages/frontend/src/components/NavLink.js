import React from 'react';
import PropTypes from 'prop-types';
import { NavLink as Link } from 'react-router-dom';

function NavLink({
  children, to, exact, fn,
}) {
  return (
    <Link className="usa-nav__link" to={to} activeClassName="usa-current" exact={exact} onClick={fn}>
      { children }
    </Link>
  );
}

NavLink.propTypes = {
  children: PropTypes.node.isRequired,
  to: PropTypes.string.isRequired,
  exact: PropTypes.bool,
  fn: PropTypes.func,
};

NavLink.defaultProps = {
  exact: false,
  fn: () => {},
};

export default NavLink;
