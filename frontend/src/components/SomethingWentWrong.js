/* eslint-disable max-len */
import React, { useContext, useEffect } from 'react';
import { Link } from '@trussworks/react-uswds';
import { Link as ReactLink } from 'react-router-dom';
import ReactRouterPropTypes from 'react-router-prop-types';
import HideSiteNavContext from '../HideSiteNavContext';
import './SomethingWentWrong.scss';

function SomethingWentWrong({ match }) {
  const { responseCode } = match.params;
  const { setHideSiteNav } = useContext(HideSiteNavContext);

  const supportLink = 'https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a';
  const getSupportLink = () => (
    <Link key="support-link" className="usa-nav__link" href={supportLink} target="_blank" rel="noopener noreferrer">support</Link>
  );

  const determineMessage = () => {
  // 403 Forbidden.
    if (responseCode === '403') {
      return (
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
                    Contact
                    {' '}
                    {getSupportLink()}
                    {' '}
                    and ask them to check your permissions.
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
              If you believe this is an error or need further assistance, get in touch with
              {' '}
              {getSupportLink()}
              .
            </p>
          </div>
        </div>
      );
    }

    // 404 Not found.
    if (responseCode === '404') {
      return (
        <div className="smart-hub--something-went-wrong padding-3">
          <h3 className="margin-bottom-1">404 error</h3>
          <h1 className="margin-top-0 margin-bottom-2">Page not found</h1>
          <div className="smart-hub--something-went-wrong-body">
            <p>
              Well, this is awkward. It seems like the page you&apos;re looking for has taken a detour into the unknown. Here&apos;s what you can do:
              <ul>
                <li>
                  Go back to
                  {' '}
                  <ReactLink to="/">home</ReactLink>
                </li>
                <li>
                  Contact
                  {' '}
                  {getSupportLink()}
                  {' '}
                  for help
                </li>
              </ul>
              Thanks for your understanding and patience!
            </p>
          </div>
        </div>
      );
    }

    // 500 Internal server error (display for everything else).
    return (
      <div className="smart-hub--something-went-wrong padding-3">
        <h1 className="margin-top-0 margin-bottom-2">Something went wrong.</h1>
        <div className="smart-hub--something-went-wrong-body">
          <p>
            Well, this is awkward. It seems like the page you&apos;re looking for has taken a detour into the unknown. Here&apos;s what you can do:
            <ul>
              <li>
                Go back to
                {' '}
                <ReactLink to="/">home</ReactLink>
              </li>
              <li>
                Contact
                {' '}
                {getSupportLink()}
                {' '}
                for help
              </li>
            </ul>
            Thanks for your understanding and patience!
          </p>
        </div>
      </div>
    );
  };

  useEffect(() => {
    setHideSiteNav(true);
    return () => setHideSiteNav(false);
  }, [setHideSiteNav]);

  return (
    <>
      {determineMessage(responseCode)}
    </>
  );
}

SomethingWentWrong.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};

export default SomethingWentWrong;
