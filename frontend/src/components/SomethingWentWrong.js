import React, { useContext } from 'react'
import { Link } from '@trussworks/react-uswds'
import { Helmet } from 'react-helmet'
import { Link as RouterLink } from 'react-router-dom'
import PropTypes from 'prop-types'
import AppLoadingContext from '../AppLoadingContext'

const SUPPORT_LINK = 'https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a'

const LinkToHome = () => <RouterLink to="/">home</RouterLink>

const SupportLink = () => (
  <Link key="support-link" className="usa-nav__link" href={SUPPORT_LINK} target="_blank" rel="noopener noreferrer">
    support
  </Link>
)

const IntoTheUnknown = () => (
  <div>
    <p className="usa-prose">
      Well, this is awkward. It seems like the page you&apos;re looking for has taken a detour into the unknown. Here&apos;s what you can do:
    </p>
    <ul className="usa-list">
      <li>
        Go back to <LinkToHome />
      </li>
      <li>
        Contact <SupportLink /> for help
      </li>
    </ul>
    <p className="usa-prose">Thanks for your understanding and patience!</p>
  </div>
)

const Forbidden = () => (
  <div>
    <p className="usa-prose">Sorry, but it looks like you&apos;re trying to access a restricted area. Here&apos;s what you can do:</p>
    <ul className="usa-list">
      <li>
        <strong>Double-check permissions:</strong> Ensure you have the proper clearance to access this page
        <div>
          Contact <SupportLink /> and ask them to check your permissions.
        </div>
      </li>
      <li>
        <strong>Login again:</strong> Try logging in again. Maybe that&apos;s the missing key.
      </li>
      <li>
        <strong>Explore elsewhere:</strong> Return to the main area and explore other permitted sections.
      </li>
    </ul>
    <p className="usa-prose">
      If you believe this is an error or need further assistance, get in touch with <SupportLink />.
    </p>
  </div>
)

const responseCodeMessages = {
  401: {
    message: '401 error - unauthorized',
    title: 'Restricted access.',
    body: <Forbidden />,
  },
  403: {
    message: '403 error - forbidden',
    title: 'Restricted access.',
    body: <Forbidden />,
  },
  404: {
    message: '404 error',
    title: 'Page not found.',
    body: <IntoTheUnknown />,
  },
  500: {
    message: null,
    title: 'Something went wrong.',
    body: <IntoTheUnknown />,
  },
}

function SomethingWentWrong({ responseCode }) {
  const { setIsAppLoading, isAppLoading } = useContext(AppLoadingContext)

  // Make sure if something was loading when an error occurred, we stop the loading spinner.
  if (isAppLoading) setIsAppLoading(false)

  const messageToDisplay = responseCodeMessages[responseCode] || responseCodeMessages[500]

  return (
    <>
      <Helmet>
        <title>{messageToDisplay.title}</title>
      </Helmet>
      <div className="smart-hub--something-went-wrong padding-3">
        {messageToDisplay.message && <h3 className="margin-bottom-1 base-medium">{messageToDisplay.message}</h3>}
        <h1 className="margin-top-0 margin-bottom-2 font-serif-2xl">{messageToDisplay.title}</h1>
        <div className="smart-hub--something-went-wrong-body maxw-tablet-lg">{messageToDisplay.body}</div>
      </div>
    </>
  )
}

SomethingWentWrong.propTypes = {
  responseCode: PropTypes.number,
}

SomethingWentWrong.defaultProps = {
  responseCode: 500,
}

export default SomethingWentWrong
