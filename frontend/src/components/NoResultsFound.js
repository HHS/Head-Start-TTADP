import { faChartColumn } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import React, { useRef } from 'react';
import colors from '../colors';
import ContentFromFeedByTag from './ContentFromFeedByTag';
import Drawer from './Drawer';
import DrawerTriggerButton from './DrawerTriggerButton';
import './NoResultsFound.scss';

function NoResultsFound({ customMessage, hideFilterHelp, drawerConfig }) {
  const drawerTriggerRef = useRef(null);
  const showFilterHelp = !hideFilterHelp && Boolean(drawerConfig?.title && drawerConfig?.tagName);

  return (
    <div className="smart-hub--no-results-found display-flex flex-justify-center flex-align-center text-center height-full">
      <FontAwesomeIcon icon={faChartColumn} color={colors.baseDarkest} size="2x" />
      <h3 className="margin-y-1">No results found.</h3>
      <span className="margin-bottom-1">
        {customMessage || 'Try removing or changing the selected filters.'}
      </span>
      {showFilterHelp && (
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
    title: PropTypes.string.isRequired,
    tagName: PropTypes.string.isRequired,
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
