import React, { useContext } from 'react';
import { Link, Button } from '@trussworks/react-uswds';
import { useHistory } from 'react-router-dom';
import PropTypes from 'prop-types';
import SomethingWentWrongContext from '../SomethingWentWrongContext';
import './SomethingWentWrong.scss';

/* eslint-disable max-len */

function SomethingWentWrong({ errorResponseCode }) {
  const { setErrorResponseCode } = useContext(SomethingWentWrongContext);
  const history = useHistory();

  const supportLink = 'https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a';
  const getSupportLink = () => (
    <Link key="support-link" className="usa-nav__link" href={supportLink} target="_blank" rel="noopener noreferrer">support</Link>
  );

  const onHomeClick = () => {
    setErrorResponseCode(null);
    history.push('/');
  };

  const responseCodeMessages = [
    {
      code: 401,
      message: '401 error - unauthorized',
      title: 'Unauthorized access',
      body: (
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
      ),
    },
    {
      code: 403,
      message: '403 error - forbidden',
      title: 'Restricted access',
      body: (
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
      ),
    },
    {
      code: 404,
      message: '404 error',
      title: 'Page not found',
      body: (
        <p>
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
      code: 500,
      message: null,
      title: 'Something went wrong',
      body: (
        <p>
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

  const messageToDisplay = responseCodeMessages.find((msg) => msg.code === errorResponseCode) || responseCodeMessages.find((msg) => msg.code === 500);

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
  errorResponseCode: PropTypes.number.isRequired,
};

export default SomethingWentWrong;
