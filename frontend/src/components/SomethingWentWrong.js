import React, { useContext } from 'react';
import { Link, Button } from '@trussworks/react-uswds';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import SomethingWentWrongContext from '../SomethingWentWrongContext';
import AppLoadingContext from '../AppLoadingContext';
import './SomethingWentWrong.scss';

/* eslint-disable max-len */

function SomethingWentWrong({ passedErrorResponseCode }) {
  const {
    setErrorResponseCode, errorResponseCode, setShowingNotFound, showingNotFound,
  } = useContext(SomethingWentWrongContext);
  const { setIsAppLoading, isAppLoading } = useContext(AppLoadingContext);
  const navigate = useNavigate();

  // Make sure if something was loading when an error occurred, we stop the loading spinner.
  if (isAppLoading) setIsAppLoading(false);

  // Make sure if we are showing not found we hide the NAV.
  if (!errorResponseCode && (!showingNotFound && passedErrorResponseCode === 404)) setShowingNotFound(true);

  const supportLink = 'https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a';
  const getSupportLink = () => (
    <Link key="support-link" className="usa-nav__link" href={supportLink} target="_blank" rel="noopener noreferrer">support</Link>
  );

  const onHomeClick = () => {
    setErrorResponseCode(null);
    setShowingNotFound(false);
    navigate('/');
  };

  const responseCodeMessages = [
    {
      codes: [401, 403],
      message: '403 error - forbidden',
      title: 'Restricted access.',
      body: (
        <p className="usa-prose">
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
      ),
    },
    {
      codes: [404],
      message: '404 error',
      title: 'Page not found.',
      body: (
        <p className="usa-prose">
          Well, this is awkward. It seems like the page you&apos;re looking for has taken a detour into the unknown. Here&apos;s what you can do:
          <ul>
            <li>
              Go back to
              {' '}
              <Button unstyled onClick={onHomeClick}>home</Button>
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
      ),
    },
    {
      codes: [500],
      message: null,
      title: 'Something went wrong.',
      body: (
        <p className="usa-prose">
          Well, this is awkward. It seems like the page you&apos;re looking for has taken a detour into the unknown. Here&apos;s what you can do:
          <ul>
            <li>
              Go back to
              {' '}
              <Button unstyled onClick={onHomeClick}>home</Button>
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
      ),

    },
  ];

  const messageToDisplay = responseCodeMessages.find((msg) => msg.codes.includes(passedErrorResponseCode)) || responseCodeMessages.find((msg) => msg.code === 500);

  return (
    <div className="smart-hub--something-went-wrong padding-3">
      {
        messageToDisplay.message && (
        <h3 className="margin-bottom-1">{messageToDisplay.message}</h3>
        )
      }
      <h1 className="margin-top-0 margin-bottom-2">{messageToDisplay.title}</h1>
      <div className="smart-hub--something-went-wrong-body">
        {
          messageToDisplay.body
        }
      </div>
    </div>
  );
}

SomethingWentWrong.propTypes = {
  passedErrorResponseCode: PropTypes.number,
};

SomethingWentWrong.defaultProps = {
  passedErrorResponseCode: 404,
};

export default SomethingWentWrong;
