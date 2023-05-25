import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import './Tabs.scss';
import colors from '../colors';

export default function RecipientTabs({
  tabs, backLink, ariaLabel,
}) {
  const linkClass = 'display-block padding-2 ttahub-tabs--tabs_link';
  const liClass = 'ttahub-tabs--tabs_tab display-block margin-0 padding-0';

  return (
    <div className="ttahub-tabs--tabs no-print">
      <nav className="ttahub-tabs--tabs_nav bg-white" aria-label={ariaLabel}>
        <ul className="ttahub-tabs--tabs-ul display-flex margin-0 margin-bottom-5 padding-0">
          {tabs.map((tab) => (

            <li className={liClass}>
              <NavLink activeClassName={`${linkClass}--active`} className={`${linkClass}`} to={`/training-reports/${tab.value}`}>{tab.key}</NavLink>
            </li>
          ))}
        </ul>
      </nav>
      { backLink && backLink.props && backLink.props.children ? (<FontAwesomeIcon className="margin-right-1" data-testid="back-link-icon" color={colors.ttahubMediumBlue} icon={faArrowLeft} />) : null }
      {backLink}
    </div>
  );
}

RecipientTabs.propTypes = {
  tabs: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.number,
    value: PropTypes.element,
  })).isRequired,
  backLink: PropTypes.node,
  ariaLabel: PropTypes.string.isRequired,
};

RecipientTabs.defaultProps = {
  backLink: null,
};
