import React from 'react';

import logo1x from '../images/eclkc-blocks-logo-43x56.png';
import logo2x from '../images/eclkc-blocks-logo-86x111.png';

function Header() {
  return (
    <header className="smart-hub-header bg-white width-viewport height-9 display-flex flex-row flex-align-start border-bottom border-base-lighter">
      <div className="flex-column flex-align-self-center margin-left-2">
        <img src={logo1x} srcSet={`${logo2x} 2x`} width="43" height="56" alt="ECLKC Blocks Logo" className="smart-hub-logo" />
      </div>
      <div className="flex-column flex-align-self-center margin-left-2">
        <h1 className="smart-hub-title font-family-sans margin-y-1">Office of Head Start TTA Smart Hub</h1>
      </div>
    </header>
  );
}

export default Header;
