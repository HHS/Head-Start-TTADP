import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import colors from '../colors';
import './Tabs.scss';

export default function Tabs({
  tabs, backLink, ariaLabel, prefix,
}) {
  const linkClass = 'display-block padding-2 ttahub-tabs--tabs_link';
  const liClass = 'ttahub-tabs--tabs_tab display-block margin-0 padding-0';

  return (
    <div className="ttahub-tabs--tabs no-print">
      <nav className="ttahub-tabs--tabs_nav bg-white" aria-label={ariaLabel}>
        <ul className="ttahub-tabs--tabs-ul display-flex margin-0 margin-bottom-0 padding-0">
          {tabs.map((tab) => (
            <li className={liClass} key={`tab-list-item-${tab.value}`}>
              <NavLink activeClassName={`${linkClass}--active`} className={`${linkClass}`} to={`/${prefix}/${tab.value}`}>{tab.key}</NavLink>
            </li>
          ))}
        </ul>
      </nav>
      { backLink && backLink.props && backLink.props.children ? (<FontAwesomeIcon className="margin-right-1" data-testid="back-link-icon" color={colors.ttahubMediumBlue} icon={faArrowLeft} />) : null }
      {backLink}
    </div>
  );
}

Tabs.propTypes = {
  tabs: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    value: PropTypes.string,
  })).isRequired,
  backLink: PropTypes.node,
  ariaLabel: PropTypes.string.isRequired,
  prefix: PropTypes.string,
};

Tabs.defaultProps = {
  backLink: null,
  prefix: 'training-reports',
};
