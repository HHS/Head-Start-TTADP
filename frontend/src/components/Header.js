/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-restricted-globals */
import React, { useEffect, useState } from 'react';
import { withRouter } from 'react-router-dom';

import logo1x from '../images/eclkc-blocks-logo-43x56.png';
import logo2x from '../images/eclkc-blocks-logo-86x111.png';

function Header() {
  const [showActivityReportSurveyButton, setShowActivityReportSurveyButton] = useState(false);

  useEffect(() => {
    if (location.pathname === '/activity-reports') {
      setShowActivityReportSurveyButton(true);
    } else {
      setShowActivityReportSurveyButton(false);
    }
  }, [location.pathname]);

  return (
    <div>
      <div className={`position-relative z-top display-${showActivityReportSurveyButton ? 'block' : 'none'}`}>
        <button id="tp-ar-landing-survey" className={'usa-button position-fixed  bottom-2 right-1\'}'} aria-label="Please leave feedback" type="button">Please leave feedback</button>
      </div>
      <header className="smart-hub-header height-9 pin-top pin-x position-fixed z-top bg-white border-bottom border-base-lighter">
        <div className="display-flex flex-row flex-align-start height-full">
          <div className="flex-column flex-align-self-center margin-left-2">
            <img src={logo1x} srcSet={`${logo2x} 2x`} width="43" height="56" alt="ECLKC Blocks Logo" className="smart-hub-logo" />
          </div>
          <div className="flex-column flex-align-self-center margin-left-2">
            <p className="smart-hub-title font-family-sans text-bold margin-y-1">Office of Head Start TTA Smart Hub</p>
          </div>
        </div>
      </header>
    </div>
  );
}

export default withRouter(Header);
