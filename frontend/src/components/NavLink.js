import React from 'react';
import PropTypes from 'prop-types';
import { NavLink as Link } from 'react-router-dom';

function NavLink({ children, to, exact }) {
  return (
    <Link className="usa-nav__link" to={to} activeClassName="usa-current" exact={exact}>
      { children }
    </Link>
  );
}

NavLink.propTypes = {
  children: PropTypes.node.isRequired,
  to: PropTypes.string.isRequired,
  exact: PropTypes.bool,
};

NavLink.defaultProps = {
  exact: false,
};

export default NavLink;
