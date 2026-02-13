import React, { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import IdleModal from './IdleModal'

export default function AppWrapper({ padded, authenticated, children, logout, hasAlerts }) {
  const appWrapperRef = useRef(null)

  // This resizes the site nav content's gap to account for the header if there is an alert
  useEffect(() => {
    if (hasAlerts && appWrapperRef.current) {
      const header = document.querySelector('.smart-hub-header.has-alerts')

      if (header) {
        appWrapperRef.current.style.marginTop = `${appWrapperRef.current.style.marginTop + header.offsetHeight}px`
      }
    }
  }, [hasAlerts])

  if (!authenticated) {
    return children
  }

  const content = (
    <div role="main" id="main-content">
      {' '}
      <IdleModal
        modalTimeout={Number(process.env.REACT_APP_INACTIVE_MODAL_TIMEOUT)}
        logoutTimeout={Number(process.env.REACT_APP_SESSION_TIMEOUT)}
        logoutUser={logout}
      />
      {children}
    </div>
  )

  if (padded) {
    return (
      <div
        ref={appWrapperRef}
        id="appWrapper"
        className="maxw-widescreen flex-align-start smart-hub-offset-nav tablet:smart-hub-offset-nav desktop:smart-hub-offset-nav desktop:margin-top-9 margin-top-6"
      >
        <div className="padding-3 tablet:padding-5">{content}</div>
      </div>
    )
  }

  return (
    <div
      ref={appWrapperRef}
      id="appWrapper"
      className="flex-align-start smart-hub-offset-nav tablet:smart-hub-offset-nav desktop:smart-hub-offset-nav desktop:margin-top-9 margin-top-6"
    >
      <div className="padding-x-3 padding-bottom-3 tablet:padding-x-5 tablet:padding-bottom-5">{content}</div>
    </div>
  )
}

AppWrapper.propTypes = {
  authenticated: PropTypes.bool,
  padded: PropTypes.bool,
  children: PropTypes.node.isRequired,
  logout: PropTypes.func,
  hasAlerts: PropTypes.bool,
}

AppWrapper.defaultProps = {
  authenticated: false,
  padded: true,
  hasAlerts: false,
  logout: () => {},
}
