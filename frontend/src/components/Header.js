import React from 'react'
import PropTypes from 'prop-types'
import HeaderUserMenu from './HeaderUserMenu'
import logo1x from '../images/headstart-blocks-logo-43x56.png'
import logo2x from '../images/headstart-blocks-logo-86x111.png'
import ReadOnlyEditor from './ReadOnlyEditor'
import SiteAlert from './SiteAlert'

function Header({ authenticated, alert, areThereUnreadNotifications, setAreThereUnreadNotifications }) {
  const headerClassNames = ['smart-hub-header', 'pin-top', 'pin-x', 'position-fixed', 'bg-white', 'border-bottom', 'border-base-lighter']

  if (alert) {
    headerClassNames.push('has-alerts')
  }

  return (
    <header className={headerClassNames.join(' ')} style={{ zIndex: '99' }}>
      {alert && authenticated && (
        <>
          <SiteAlert heading={alert.title} variant={alert.variant} size={alert.size}>
            <ReadOnlyEditor value={alert.message} ariaLabel="alert for the tta hub: " />
          </SiteAlert>
        </>
      )}
      <div className="display-flex flex-row flex-align-center flex-justify padding-x-2">
        <div className="display-flex flex-align-center">
          <div className="display-flex flex-column flex-align-center">
            <img
              src={logo1x}
              srcSet={`${logo2x} 2x`}
              alt="Office of Head Start logo"
              className="flex-align-self-center height-auto desktop:width-5 width-4"
            />
          </div>
          <div className="flex-column desktop:margin-left-105 margin-left-1">
            <p className="smart-hub-title font-family-sans text-bold margin-y-1">Office of Head Start TTA Hub</p>
          </div>
        </div>
        <div className="flex-column flex-align-self-center">
          <HeaderUserMenu areThereUnreadNotifications={areThereUnreadNotifications} setAreThereUnreadNotifications={setAreThereUnreadNotifications} />
        </div>
      </div>
    </header>
  )
}

Header.propTypes = {
  authenticated: PropTypes.bool.isRequired,
  alert: PropTypes.shape({
    title: PropTypes.string,
    message: PropTypes.string,
    variant: PropTypes.string,
    size: PropTypes.string,
  }),
  areThereUnreadNotifications: PropTypes.bool.isRequired,
  setAreThereUnreadNotifications: PropTypes.func.isRequired,
}

Header.defaultProps = {
  alert: null,
}

export default Header
