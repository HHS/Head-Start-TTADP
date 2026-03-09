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

function NoResultsFound({ customMessage, hideFilterHelp, drawerConfig }) {
  const drawerTriggerRef = useRef(null);
  return (
    <div className="smart-hub--no-results-found display-flex flex-justify-center flex-align-center text-center height-full">
      <FontAwesomeIcon icon={faChartColumn} color={colors.baseDarkest} size="2x" />
      <h3 className="margin-y-1">No results found.</h3>
      <span className="margin-bottom-1">{customMessage || 'Try removing or changing the selected filters.'}</span>
      {!hideFilterHelp && (
      <>
        <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>
          Get help using filters
        </DrawerTriggerButton>
        <Drawer title={drawerConfig.title} triggerRef={drawerTriggerRef}>
          <ContentFromFeedByTag tagName={drawerConfig.tagName} />
        </Drawer>
      </>
      )}
    </div>
  );
}

NoResultsFound.propTypes = {
  customMessage: PropTypes.string,
  hideFilterHelp: PropTypes.bool,
  drawerConfig: PropTypes.shape({
    title: PropTypes.string,
    tagName: PropTypes.string,
  }),
};

NoResultsFound.defaultProps = {
  customMessage: '',
  hideFilterHelp: false,
  drawerConfig: {
    title: 'QA dashboard filters',
    tagName: 'ttahub-qa-dash-filters',
  },
};

export default NoResultsFound;
