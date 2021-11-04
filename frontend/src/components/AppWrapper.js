import React from 'react';
import PropTypes from 'prop-types';
import IdleModal from './IdleModal';

export default function AppWrapper({
  padded, authenticated, children, logout,
}) {
  const content = authenticated ? (
    <div role="main" id="main-content">
      {' '}
      <IdleModal
        modalTimeout={Number(process.env.REACT_APP_INACTIVE_MODAL_TIMEOUT)}
        logoutTimeout={Number(process.env.REACT_APP_SESSION_TIMEOUT)}
        logoutUser={logout}
      />
      {children}
    </div>
  ) : children;

  if (padded) {
    return (
      <div className="grid-row maxw-widescreen flex-align-start smart-hub-offset-nav tablet:smart-hub-offset-nav desktop:smart-hub-offset-nav margin-top-9 margin-right-5">
        <div className="grid-col-12 margin-top-2 margin-right-2 margin-left-3">
          <section className="usa-section padding-top-3">
            {content}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="grid-row flex-align-start smart-hub-offset-nav tablet:smart-hub-offset-nav desktop:smart-hub-offset-nav margin-top-9">
      <div className="grid-col-12">
        <section className="usa-section padding-top-0">
          {content}
        </section>
      </div>
    </div>
  );
}

AppWrapper.propTypes = {
  authenticated: PropTypes.bool,
  padded: PropTypes.bool,
  children: PropTypes.node.isRequired,
  logout: PropTypes.func.isRequired,
};

AppWrapper.defaultProps = {
  authenticated: false,
  padded: true,
};
