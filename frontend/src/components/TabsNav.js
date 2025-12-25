import React from 'react';
import PropTypes from 'prop-types';
import { uniqueId } from 'lodash';
import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import colors from '../colors';
import './TabsNav.scss';
import FeatureFlag from './FeatureFlag';

export default function TabsNav({ backLink, links, ariaLabel }) {
  const linkClass = 'display-block padding-2 ttahub-tabs-nav_link';
  const liClass = 'ttahub-tabs-nav_tab display-block margin-0 padding-0';

  return (
    <>
      <div className="ttahub-tabs-nav no-print z-100 position-sticky">
        <nav className="ttahub-tabs-nav_nav bg-white" aria-label={ariaLabel}>
          <ul className="display-flex margin-0 margin-bottom-5 padding-0">
            {links.map((link) => (
              link.featureFlag ? (
                <FeatureFlag key={uniqueId('tabsnav-link_')} flag={link.featureFlag}>
                  <li className={liClass}>
                    <NavLink activeClassName={`${linkClass}--active`} className={`${linkClass}`} to={link.to}>{link.label}</NavLink>
                  </li>
                </FeatureFlag>
              ) : (
                <li key={uniqueId('tabsnav-link_')} className={liClass}>
                  <NavLink activeClassName={`${linkClass}--active`} className={`${linkClass}`} to={link.to}>{link.label}</NavLink>
                </li>
              )
            ))}
          </ul>
        </nav>
      </div>
      <div>
        { backLink && backLink.props && backLink.props.children ? (<FontAwesomeIcon className="margin-right-1" data-testid="back-link-icon" color={colors.ttahubMediumBlue} icon={faArrowLeft} />) : null }
        {backLink}
      </div>
    </>
  );
}

TabsNav.propTypes = {
  ariaLabel: PropTypes.string.isRequired,
  links: PropTypes.arrayOf(PropTypes.shape({
    featureFlag: PropTypes.string,
    to: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  })).isRequired,
  backLink: PropTypes.node,
};

TabsNav.defaultProps = {
  backLink: null,
};
