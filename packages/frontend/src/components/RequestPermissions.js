import React from 'react';

import HubIdentifier from './HubIdentifier';

function RequestPermissions() {
  return (
    <div className="display-flex flex-column height-viewport">
      <div role="dialog" aria-labelledby="permissions-message" aria-describedby="permissions-description" className="position-relative margin-x-auto margin-top-7 z-top flex-1">
        <div className="maxw-mobile-lg margin-x-auto padding-y-7">
          <h1 id="permissions-message" className="font-serif-xl text-center margin-y-4 margin-x-2">
            You need permission to access the TTA Hub.
          </h1>
          <div className="text-center">
            <p className="margin-bottom-4">
              <a className="usa-button display-inline-block margin-x-1" href="https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a">
                Request Permission
              </a>
            </p>
            <p className="text-bold">
              First time logging in?
            </p>
            <p id="permissions-description">
              Request permission to use the system.
            </p>
          </div>
        </div>
      </div>
      <HubIdentifier />
    </div>
  );
}

export default RequestPermissions;
