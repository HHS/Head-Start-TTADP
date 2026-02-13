import React, { useRef } from 'react'
import { faChartColumn } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import DrawerTriggerButton from './DrawerTriggerButton'
import Drawer from './Drawer'
import ContentFromFeedByTag from './ContentFromFeedByTag'
import colors from '../colors'
import './NoResultsFound.scss'

function NoResultsFound() {
  const drawerTriggerRef = useRef(null)
  return (
    <div className="smart-hub--no-results-found display-flex flex-justify-center flex-align-center text-center height-full">
      <FontAwesomeIcon icon={faChartColumn} color={colors.baseDarkest} size="2x" />
      <span>
        <h3 className="margin-bottom-1 margin-top-2">No results found.</h3>
      </span>
      <span className="margin-bottom-1">Try removing or changing the selected filters.</span>
      <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>Get help using filters</DrawerTriggerButton>
      <Drawer title="QA dashboard filters" triggerRef={drawerTriggerRef}>
        <ContentFromFeedByTag tagName="ttahub-qa-dash-filters" />
      </Drawer>
    </div>
  )
}

export default NoResultsFound
