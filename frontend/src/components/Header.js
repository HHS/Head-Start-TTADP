import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Header as UswdsHeader, PrimaryNav, Search, Title, NavMenuButton,
} from '@trussworks/react-uswds';

import NavLink from './NavLink';

function Header({ authenticated }) {
  const [expanded, setExpanded] = useState(false);
  const onClick = () => setExpanded((prvExpanded) => !prvExpanded);

  const navItems = [
    <NavLink exact to="/">
      Home
    </NavLink>,
    <NavLink to="/activity-reports">
      Activity Reports
    </NavLink>,
    <NavLink to="/admin">
      Admin
    </NavLink>,
  ];

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
            items={navItems}
            mobileExpanded={expanded}
            onToggleMobileNav={onClick}
          >
            <Search small />
          </PrimaryNav>
          )}
        </div>
      </UswdsHeader>
    </>
  );
}

Header.propTypes = {
  authenticated: PropTypes.bool,
};

Header.defaultProps = {
  authenticated: false,
};

export default Header;
