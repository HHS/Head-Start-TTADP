import PropTypes from 'prop-types';
import React from 'react';
import BackLink from '../../components/BackLink';
import WhatsNew from './components/WhatsNew';

export default function Notifications({ notifications }) {
  const params = new URLSearchParams(window.location.search);
  const referrer = params.get('referrer');

  return (
    <div>
      {referrer && <BackLink to={decodeURIComponent(referrer)}>Back</BackLink>}
      <h1 className="landing margin-top-0 margin-bottom-3">Notifications</h1>
      <WhatsNew data={notifications.whatsNew} />
    </div>
  );
}

Notifications.propTypes = {
  notifications: PropTypes.shape({
    whatsNew: PropTypes.string.isRequired,
  }).isRequired,
};
