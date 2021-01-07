/*
  Stickied left nav for the navigator. Should not have any state, just displays
  the nav items passed in as props. This component has lots of custom styles
  defined. Note the nav is no longer stickied once we hit mobile widths (640px)
*/
import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import Sticky from 'react-stickynode';
import { Tag, Alert } from '@trussworks/react-uswds';
import { useMediaQuery } from 'react-responsive';
import { NavLink } from 'react-router-dom';

import Container from '../../Container';
import './SideNav.css';
import {
  NOT_STARTED, IN_PROGRESS, COMPLETE, SUBMITTED,
} from '../constants';

const tagClass = (state) => {
  switch (state) {
    case NOT_STARTED:
      return 'smart-hub--tag-not-started';
    case IN_PROGRESS:
      return 'smart-hub--tag-in-progress';
    case COMPLETE:
      return 'smart-hub--tag-complete';
    case SUBMITTED:
      return 'smart-hub--tag-submitted';
    default:
      return '';
  }
};

function SideNav({
  pages, skipTo, skipToMessage, lastSaveTime,
}) {
  const isMobile = useMediaQuery({ maxWidth: 640 });
  const navItems = () => pages.map((page) => (
    <li key={page.label} className="smart-hub--navigator-item">
      <NavLink
        to={`${page.path}`}
        activeClassName="smart-hub--navigator-link-active"
        className="smart-hub--navigator-link"
        aria-label={page.label}
      >
        <span className="margin-left-2">{page.label}</span>
        <span className="margin-left-auto margin-right-2">
          {page.state
            && (
            <Tag className={`smart-hub--tag ${tagClass(page.state)}`}>
              {page.state}
            </Tag>
            )}
        </span>
      </NavLink>
    </li>
  ));

  return (
    <Sticky top={50} enabled={!isMobile}>
      <Container padding={0}>
        <a className="smart-hub--navigator-skip-link" href={`#${skipTo}`}>{skipToMessage}</a>
        <ul className="smart-hub--navigator-list">
          {navItems()}
        </ul>
      </Container>
      {lastSaveTime
        && (
        <Alert aria-live="polite" type="success" slim noIcon className="smart-hub--save-alert">
          This report was automatically saved on
          {' '}
          {lastSaveTime.format('MM/DD/YYYY [at] h:mm a')}
        </Alert>
        )}
    </Sticky>
  );
}

SideNav.propTypes = {
  pages: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      state: PropTypes.string,
      path: PropTypes.string.isRequired,
    }),
  ).isRequired,
  skipTo: PropTypes.string.isRequired,
  skipToMessage: PropTypes.string.isRequired,
  lastSaveTime: PropTypes.instanceOf(moment),
};

SideNav.defaultProps = {
  lastSaveTime: undefined,
};

export default SideNav;
