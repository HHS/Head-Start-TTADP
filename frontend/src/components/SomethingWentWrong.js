/* eslint-disable max-len */
import React, { useContext } from 'react';
import ReactRouterPropTypes from 'react-router-prop-types';
import HideSiteNavContext from '../HideSiteNavContext';
import './SomethingWentWrong.scss';

function SomethingWentWrong({ match }) {
  const { setHideSiteNav } = useContext(HideSiteNavContext);

  const { responseCode } = match.params;

  setHideSiteNav(true);
  return (
    <>
      {responseCode && (
        <div className="smart-hub--something-went-wrong padding-3">
          <h3 className="margin-bottom-1">403 error - forbidden</h3>
          <h1 className="margin-top-0 margin-bottom-2">Restricted access.</h1>
          <div className="smart-hub--something-went-wrong-body">
            <p>
              Sorry, but it looks like you&apos;re trying to access a restricted area. Here&apos;s what you can do:
              <ul>
                <li>
                  <strong>Double-check permissions:</strong>
                  {' '}
                  Ensure you have the proper clearance to access this page
                  <div>
                    Contact support and ask them to check your permissions.
                  </div>
                </li>
                <li>
                  <strong>Login again:</strong>
                  {' '}
                  Try logging in again. Maybe that&apos;s the missing key.
                </li>
                <li>
                  <strong>Explore elsewhere:</strong>
                  {' '}
                  Return to the main area and explore other permitted sections.
                </li>
              </ul>
              If you believe this is an error or need further assistance, get in touch with support.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

SomethingWentWrong.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};

export default SomethingWentWrong;
