import React from 'react';

function RequestPermissions() {
  return (
    <>
      <div className="smart-hub-dimmer position-fixed top-0 right-0 bottom-0 left-0 z-auto bg-ink opacity-50" />
      <div role="dialog" aria-labelledby="permissions-message" aria-describedby="permissions-description" className="position-relative smart-hub-maxw-placard margin-x-auto margin-top-7 z-top bg-white">
        <div className="maxw-mobile-lg margin-x-auto padding-y-7">
          <h1 id="permissions-message" className="font-serif-xl text-center margin-y-4 margin-x-2">
            You need permission to access the TTA Hub.
          </h1>
          <div className="text-center">
            <p className="margin-bottom-4">
              <a className="usa-button smart-hub-bg-blue-primary display-inline-block margin-x-1" href="https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a">
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
    </>
  );
}

export default RequestPermissions;
