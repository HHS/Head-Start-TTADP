import React, { useState } from 'react';
import {
  Header as UswdsHeader, PrimaryNav, Search, Title, NavMenuButton,
} from '@trussworks/react-uswds';

import NavLink from './NavLink';

function Header() {
  const [expanded, setExpanded] = useState(false);
  const onClick = () => setExpanded((prvExpanded) => !prvExpanded);

  const navItems = [
    <NavLink exact to="/">
      Home
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
            <Title>TTADP</Title>
            <NavMenuButton onClick={onClick} label="Menu" />
          </div>
          <PrimaryNav
            items={navItems}
            mobileExpanded={expanded}
            onToggleMobileNav={onClick}
          >
            <Search small />
          </PrimaryNav>
        </div>
      </UswdsHeader>
    </>
  );
}

Header.propTypes = {};

export default Header;
