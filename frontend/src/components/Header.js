import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Header as UswdsHeader, PrimaryNav, Title, NavMenuButton,
} from '@trussworks/react-uswds';

import NavLink from './NavLink';

function Header({ authenticated, admin }) {
  const [expanded, setExpanded] = useState(false);
  const onClick = () => setExpanded((prvExpanded) => !prvExpanded);

  const navItems = [
    <NavLink exact to="/">
      Home
    </NavLink>,
    <NavLink to="/activity-reports/new">
      Activity Reports
    </NavLink>,
  ];

  const adminNavItem = [
    <NavLink to="/admin">
      Admin
    </NavLink>,
  ];

  const items = admin ? navItems.concat(adminNavItem) : navItems;

  return (
    <>
      <div className={`usa-overlay ${expanded ? 'is-visible' : ''}`} />
      <UswdsHeader basic>
        <div className="usa-nav-container">
          <div className="usa-navbar">
            <Title>TTA Smart Hub</Title>
            {authenticated
            && <NavMenuButton onClick={onClick} label="Menu" />}
          </div>
          {authenticated
          && (
          <PrimaryNav
            role="navigation"
            items={items}
            mobileExpanded={expanded}
            onToggleMobileNav={onClick}
          />
          )}
        </div>
      </UswdsHeader>
    </>
  );
}

Header.propTypes = {
  authenticated: PropTypes.bool,
  admin: PropTypes.bool,
};

Header.defaultProps = {
  authenticated: false,
  admin: false,
};

export default Header;
