import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import colors from '../colors';
import './BackLink.scss';

export default function BackLink({
  to, children, iconClasses, linkClasses,
}) {
  return (
    <>
      <FontAwesomeIcon className={`margin-right-1 no-print ${iconClasses}`} data-testid="back-link-icon" color={colors.ttahubBlue} icon={faArrowLeft} />
      <Link className={`no-print ttahub-back-link text-ttahub-blue margin-bottom-2 display-inline-block ${linkClasses}`} to={to}>{children}</Link>
    </>
  );
}

BackLink.propTypes = {
  to: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  iconClasses: PropTypes.string,
  linkClasses: PropTypes.string,
};

BackLink.defaultProps = {
  iconClasses: '',
  linkClasses: '',
};
