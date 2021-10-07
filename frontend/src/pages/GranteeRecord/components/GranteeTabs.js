import React from 'react';
import PropTypes from 'prop-types';
import { NavLink, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import './GranteeTabs.css';

export default function GranteeTabs({ region, granteeId }) {
  const linkClass = 'display-block padding-2 ttahub-grantee-record--tabs_link';
  const liClass = 'ttahub-grantee-record--tabs_tab display-block margin-0 margin-top-1 padding-0';

  return (
    <div className="ttahub-grantee-record--tabs">
      <nav className="ttahub-grantee-record--tabs_nav bg-white">
        <ul className="display-flex margin-0 margin-bottom-2 padding-0">
          <li className={liClass}>
            <NavLink activeClassName={`${linkClass}--active`} className={`${linkClass}`} to={`/region/${region}/grantee/${granteeId}/profile`}>Profile</NavLink>
          </li>
          <li className={liClass}>
            <NavLink activeClassName={`${linkClass}--active`} className={`${linkClass}`} to={`/region/${region}/grantee/${granteeId}/tta-history`}>TTA History</NavLink>
          </li>
        </ul>
      </nav>
      <FontAwesomeIcon className="margin-left-2 margin-right-1" color="#0166ab" icon={faArrowLeft} />
      <Link className="ttahub-grantee-record--tabs_back-to-search" to="/grantee-search">Back to search</Link>
    </div>
  );
}

GranteeTabs.propTypes = {
  region: PropTypes.string.isRequired,
  granteeId: PropTypes.string.isRequired,
};
