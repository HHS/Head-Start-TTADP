import React from 'react';
import PropTypes from 'prop-types';
import HeaderUserMenu from './HeaderUserMenu';

import logo1x from '../images/eclkc-blocks-logo-43x56.png';
import logo2x from '../images/eclkc-blocks-logo-86x111.png';
import ReadOnlyEditor from './ReadOnlyEditor';
import SiteAlert from './SiteAlert';

function Header({ authenticated, alert }) {
  const headerClassNames = [
    'smart-hub-header',
    'pin-top',
    'pin-x',
    'position-fixed',
    'bg-white',
    'border-bottom',
    'border-base-lighter',
  ];

  if (!alert) {
    headerClassNames.push('height-9');
  }

  if (alert) {
    headerClassNames.push('has-alerts');
  }

  return (
    <header className={headerClassNames.join(' ')} style={{ zIndex: '99998' }}>
      {(alert && authenticated) && (
        <>
          <SiteAlert
            heading={alert.title}
            variant={alert.variant}
          >
            <ReadOnlyEditor value={alert.message} ariaLabel="alert for the tta hub: " />
          </SiteAlert>
        </>
      )}
      <div className="display-flex flex-row flex-align-start height-full flex-justify">
        <div className="display-flex">
          <div className="flex-column flex-align-self-center margin-left-2">
            <img src={logo1x} srcSet={`${logo2x} 2x`} width="43" height="56" alt="ECLKC Blocks Logo" className="smart-hub-logo" />
          </div>
          <div className="flex-column flex-align-self-center margin-left-2">
            <p className="smart-hub-title font-family-sans text-bold margin-y-1">Office of Head Start TTA Hub</p>
          </div>
        </div>
        <div className="flex-column flex-align-self-center margin-right-2">
          <HeaderUserMenu />
        </div>
      </div>
    </header>
  );
}

Header.propTypes = {
  authenticated: PropTypes.bool.isRequired,
  alert: PropTypes.shape({
    title: PropTypes.string,
    message: PropTypes.string,
    variant: PropTypes.string,
  }),
};

Header.defaultProps = {
  alert: null,
};

export default Header;
