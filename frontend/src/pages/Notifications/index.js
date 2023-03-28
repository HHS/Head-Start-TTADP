import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import WhatsNew from './components/WhatsNew';
import colors from '../../colors';
import './Notifications.scss';

export default function Notifications({ notifications }) {
  const params = new URLSearchParams(window.location.search);
  const referrer = params.get('ref');

  return (
    <div>
      {referrer && (
        <>
          <FontAwesomeIcon className="margin-right-1" data-testid="back-link-icon" color={colors.ttahubMediumBlue} icon={faArrowLeft} />
          <Link className=" margin-bottom-2 display-inline-block" to={referrer}>Back</Link>
        </>
      )}
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
