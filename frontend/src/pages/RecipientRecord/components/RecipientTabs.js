import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import './RecipientTabs.scss';
import colors from '../../../colors';
import FeatureFlag from '../../../components/FeatureFlag';

export default function RecipientTabs({ region, recipientId, backLink }) {
  const linkClass = 'display-block padding-2 ttahub-recipient-record--tabs_link';
  const liClass = 'ttahub-recipient-record--tabs_tab display-block margin-0 padding-0';

  return (
    <div className="ttahub-recipient-record--tabs no-print">
      <nav className="ttahub-recipient-record--tabs_nav bg-white" aria-label="Recipient links">
        <ul className="display-flex margin-0 margin-bottom-5 padding-0">
          <li className={liClass}>
            <NavLink activeClassName={`${linkClass}--active`} className={`${linkClass}`} to={`/recipient-tta-records/${recipientId}/region/${region}/profile`}>Profile</NavLink>
          </li>
          <li className={liClass}>
            <NavLink activeClassName={`${linkClass}--active`} className={`${linkClass}`} to={`/recipient-tta-records/${recipientId}/region/${region}/rttapa`}>RTTAPA</NavLink>
          </li>
          <FeatureFlag flag="communication_log">
            <li className={liClass}>
              <NavLink activeClassName={`${linkClass}--active`} className={`${linkClass}`} to={`/recipient-tta-records/${recipientId}/region/${region}/communication`}>Communication</NavLink>
            </li>
          </FeatureFlag>
          <li className={liClass}>
            <NavLink activeClassName={`${linkClass}--active`} className={`${linkClass}`} to={`/recipient-tta-records/${recipientId}/region/${region}/tta-history`}>TTA History</NavLink>
          </li>
        </ul>
      </nav>
      { backLink && backLink.props && backLink.props.children ? (<FontAwesomeIcon className="margin-right-1" data-testid="back-link-icon" color={colors.ttahubMediumBlue} icon={faArrowLeft} />) : null }
      {backLink}
    </div>
  );
}

RecipientTabs.propTypes = {
  region: PropTypes.string.isRequired,
  recipientId: PropTypes.string.isRequired,
  backLink: PropTypes.node,
};

RecipientTabs.defaultProps = {
  backLink: null,
};
