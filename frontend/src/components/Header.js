import React, { useEffect, useState } from 'react';
import { SiteAlert } from '@trussworks/react-uswds';
import HeaderUserMenu from './HeaderUserMenu';
import { getSiteAlerts } from '../fetchers/siteAlerts';

import logo1x from '../images/eclkc-blocks-logo-43x56.png';
import logo2x from '../images/eclkc-blocks-logo-86x111.png';

function Header() {
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    // fetch alerts
    async function fetchAlerts() {
      try {
        const alertFromApi = await getSiteAlerts();
        setAlert(alertFromApi);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`There was an error fetching alerts: ${e}`);
      }
    }

    fetchAlerts();
  }, []);

  return (
    <header className="smart-hub-header height-9 pin-top pin-x position-fixed bg-white border-bottom border-base-lighter" style={{ zIndex: '99998' }}>
      {alert && (
        <>
          <SiteAlert
            variant="info"
            showIcon
            title={alert.title}
          >
            {alert.message}
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

export default Header;
