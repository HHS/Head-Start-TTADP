/*
  Stickied left nav for the navigator. Should not have any state, just displays
  the nav items passed in as props. This component has lots of custom styles
  defined. Note the nav is no longer sticked once we hit mobile widths (640px)
*/
import React from 'react';
import PropTypes from 'prop-types';
import Sticky from 'react-stickynode';
import { Button, Tag } from '@trussworks/react-uswds';
import { useMediaQuery } from 'react-responsive';

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
  pages, onNavigation, skipTo, skipToMessage,
}) {
  const isMobile = useMediaQuery({ maxWidth: 640 });
  const navItems = () => pages.map((page, index) => (
    <li key={page.label} className="smart-hub--navigator-item">
      <Button
        onClick={() => onNavigation(index)}
        unstyled
        role="button"
        className={`smart-hub--navigator-link ${page.current ? 'smart-hub--navigator-link-active' : ''}`}
      >
        <span className="margin-left-2">{page.label}</span>
        <span className="margin-left-auto margin-right-2">
          <Tag className={`smart-hub--tag ${tagClass(page.state)}`}>
            {page.state}
          </Tag>
        </span>
      </Button>
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
    </Sticky>
  );
}

SideNav.propTypes = {
  pages: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      current: PropTypes.bool.isRequired,
      state: PropTypes.string.isRequired,
    }),
  ).isRequired,
  onNavigation: PropTypes.func.isRequired,
  skipTo: PropTypes.string.isRequired,
  skipToMessage: PropTypes.string.isRequired,
};

export default SideNav;
