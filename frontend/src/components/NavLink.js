import React from 'react';
import PropTypes from 'prop-types';
import { NavLink as Link } from 'react-router-dom';

function NavLink({
  children, to, fn,
}) {
  return (
    <Link className="usa-nav__link" to={to} onClick={fn}>
      { children }
    </Link>
  );
}

NavLink.propTypes = {
  children: PropTypes.node.isRequired,
  to: PropTypes.string.isRequired,
  fn: PropTypes.func,
};

NavLink.defaultProps = {
  fn: () => {},
};

export default NavLink;
