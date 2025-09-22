import React, { useRef } from 'react';
import {
  faChartColumn,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import DrawerTriggerButton from './DrawerTriggerButton';
import Drawer from './Drawer';
import ContentFromFeedByTag from './ContentFromFeedByTag';
import colors from '../colors';
import './NoResultsFound.scss';

function NoResultsFound() {
  const drawerTriggerRef = useRef(null);
  return (
    <div className="smart-hub--no-results-found display-flex flex-justify-center flex-align-center padding-x-3 text-center">
      <FontAwesomeIcon icon={faChartColumn} color={colors.baseDarkest} size="2x" />
      <span>
        <h4 className="margin-bottom-1 margin-top-2">No results found.</h4>
      </span>
      <span className="margin-bottom-1">Try removing or changing the selected filters.</span>
      <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>
        Get help using filters
      </DrawerTriggerButton>
      <Drawer title="QA dashboard filters" triggerRef={drawerTriggerRef}>
        <ContentFromFeedByTag tagName="ttahub-qa-dash-filters" />
      </Drawer>
    </div>
  );
}

export default NoResultsFound;
