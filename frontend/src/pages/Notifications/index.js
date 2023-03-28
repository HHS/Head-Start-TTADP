import React from 'react';
import PropTypes from 'prop-types';
import WhatsNew from './components/WhatsNew';
import './Notifications.scss';

export default function Notifications({ notifications }) {
  return (
    <div>
      <h1 className="landing">Notifications</h1>
      <WhatsNew data={notifications.whatsNew} />
    </div>
  );
}

Notifications.propTypes = {
  notifications: PropTypes.shape({
    whatsNew: PropTypes.string.isRequired,
  }).isRequired,
};
