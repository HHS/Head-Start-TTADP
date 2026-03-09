import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { TRACE_IDS } from '@ttahub/common';
import withWidgetData from './withWidgetData';
import LineGraphWidget from './LineGraphWidget';
import { deriveLineGraphLegendConfig } from './constants';
import WidgetContainerSubtitle from '../components/WidgetContainer/WidgetContainerSubtitle';
import DrawerTriggerButton from '../components/DrawerTriggerButton';
import Drawer from '../components/Drawer';
// import ContentFromFeedByTag from '../components/ContentFromFeedByTag';

const EXPORT_NAME = 'Active deficient citations with TTA support';

const DEFAULT_LEGEND_CONFIG = [
  {
    label: 'Active deficiencies with TTA support',
    selected: true,
    shape: 'circle',
    id: `${TRACE_IDS.ACTIVE_DEFICIENCIES_WITH_TTA_SUPPORT}-checkbox`,
    traceId: TRACE_IDS.ACTIVE_DEFICIENCIES_WITH_TTA_SUPPORT,
  },
  {
    label: 'All active deficiencies',
    selected: true,
    shape: 'triangle',
    id: `${TRACE_IDS.ALL_ACTIVE_DEFICIENCIES}-checkbox`,
    traceId: TRACE_IDS.ALL_ACTIVE_DEFICIENCIES,
  },
];

export function ActiveDeficientCitationsWithTtaSupportWidget({ data }) {
  const drawerTriggerRef = useRef(null);

  const subtitle = (
    <div className="margin-bottom-3">
      <WidgetContainerSubtitle marginY={0}>
        Active deficient citations addressed in approved Activity Reports (AR).
      </WidgetContainerSubtitle>
      <div className="margin-top-1">
        <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>
          About this data
        </DrawerTriggerButton>
      </div>
    </div>
  );

  return (
    <>
      <Drawer triggerRef={drawerTriggerRef} title="Active deficient citations with TTA support">
        Placeholder content
        {/* <ContentFromFeedByTag tagName="ttahub-qa-dash-filters" /> */}
      </Drawer>
      <LineGraphWidget
        title="Active deficient citations with TTA support"
        exportName={EXPORT_NAME}
        data={data}
        xAxisTitle="Activity report start date"
        yAxisTitle="Number of deficient citations"
        tableTitle="Active deficient citations"
        tableFirstHeading="Active deficient citations"
        subtitle={subtitle}
        legendConfig={deriveLineGraphLegendConfig(data, DEFAULT_LEGEND_CONFIG)}
      />
    </>
  );
}

ActiveDeficientCitationsWithTtaSupportWidget.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        x: PropTypes.arrayOf(PropTypes.string),
        y: PropTypes.arrayOf(PropTypes.number),
      }),
    ), PropTypes.shape({}),
  ]),
};

ActiveDeficientCitationsWithTtaSupportWidget.defaultProps = {
  data: [
    {
      name: 'Active Deficiencies with TTA support',
      x: [],
      y: [],
      month: [],
    },
    {
      name: 'All active Deficiencies',
      x: [],
      y: [],
      month: [],
    },
  ],
};

export default withWidgetData(ActiveDeficientCitationsWithTtaSupportWidget, 'activeDeficientCitationsWithTtaSupport');
