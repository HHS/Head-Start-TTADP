import React from 'react';
import PropTypes from 'prop-types';
import { NavLink, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import './RecipientTabs.css';

export default function RecipientTabs({ region, recipientId }) {
  const linkClass = 'display-block padding-2 ttahub-recipient-record--tabs_link';
  const liClass = 'ttahub-recipient-record--tabs_tab display-block margin-0 padding-0';

  return (
    <div className="ttahub-recipient-record--tabs">
      <nav className="ttahub-recipient-record--tabs_nav bg-white">
        <ul className="display-flex margin-0 margin-bottom-2 padding-0">
          <li className={liClass}>
            <NavLink activeClassName={`${linkClass}--active`} className={`${linkClass}`} to={`/recipient-tta-records/${recipientId}/region/${region}/profile`}>Profile</NavLink>
          </li>
          <li className={liClass}>
            <NavLink activeClassName={`${linkClass}--active`} className={`${linkClass}`} to={`/recipient-tta-records/${recipientId}/region/${region}/tta-history`}>TTA History</NavLink>
          </li>
        </ul>
      </nav>
      <FontAwesomeIcon className="margin-left-2 margin-right-1" color="#0166ab" icon={faArrowLeft} />
      <Link className="ttahub-recipient-record--tabs_back-to-search margin-top-2 margin-bottom-3 display-inline-block" to="/recipient-tta-records">Back to search</Link>
    </div>
  );
}

RecipientTabs.propTypes = {
  region: PropTypes.string.isRequired,
  recipientId: PropTypes.string.isRequired,
};
