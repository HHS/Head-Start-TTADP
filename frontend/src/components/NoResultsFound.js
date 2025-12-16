import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import {
  faChartColumn,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import DrawerTriggerButton from './DrawerTriggerButton';
import Drawer from './Drawer';
import ContentFromFeedByTag from './ContentFromFeedByTag';
import colors from '../colors';
import './NoResultsFound.scss';

function NoResultsFound({ customMessage, hideFilterHelp }) {
  const drawerTriggerRef = useRef(null);
  return (
    <div className="smart-hub--no-results-found display-flex flex-justify-center flex-align-center text-center height-full">
      <FontAwesomeIcon icon={faChartColumn} color={colors.baseDarkest} size="2x" />
      <span>
        <h3 className="margin-bottom-1 margin-top-2">No results found.</h3>
      </span>
      <span className="margin-bottom-1">{customMessage || 'Try removing or changing the selected filters.'}</span>
      {!hideFilterHelp && (
      <>
        <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>
          Get help using filters
        </DrawerTriggerButton>
        <Drawer title="QA dashboard filters" triggerRef={drawerTriggerRef}>
          <ContentFromFeedByTag tagName="ttahub-qa-dash-filters" />
        </Drawer>
      </>
      )}
    </div>
  );
}

NoResultsFound.propTypes = {
  customMessage: PropTypes.string,
  hideFilterHelp: PropTypes.bool,
};

NoResultsFound.defaultProps = {
  customMessage: '',
  hideFilterHelp: false,
};

export default NoResultsFound;
