import { TRACE_IDS } from '@ttahub/common';
import PropTypes from 'prop-types';
import React, { useCallback, useContext, useEffect, useRef } from 'react';
import AppLoadingContext from '../AppLoadingContext';
import ContentFromFeedByTag from '../components/ContentFromFeedByTag';
import Drawer from '../components/Drawer';
import DrawerTriggerButton from '../components/DrawerTriggerButton';
import WidgetContainerSubtitle from '../components/WidgetContainer/WidgetContainerSubtitle';
import { deriveLineGraphLegendConfig } from './constants';
import LineGraphWidget from './LineGraphWidget';
import withWidgetData from './withWidgetData';
import './ActiveNoncompliantCitationswithTtaSupport.css';

const EXPORT_NAME = 'Active noncompliant citations with TTA support';

const DEFAULT_LEGEND_CONFIG = [
  {
    label: 'Active areas of noncompliance with TTA support',
    selected: true,
    shape: 'circle',
    id: `${TRACE_IDS.ACTIVE_AREAS_OF_NONCOMPLIANCE_WITH_TTA_SUPPORT}-checkbox`,
    traceId: TRACE_IDS.ACTIVE_AREAS_OF_NONCOMPLIANCE_WITH_TTA_SUPPORT,
  },
  {
    label: 'All active areas of noncompliance',
    selected: true,
    shape: 'triangle',
    id: `${TRACE_IDS.ALL_ACTIVE_AREAS_OF_NONCOMPLIANCE}-checkbox`,
    traceId: TRACE_IDS.ALL_ACTIVE_AREAS_OF_NONCOMPLIANCE,
  },
];

export function ActiveNoncompliantCitationsWithTtaSupportWidget({ data, loading }) {
  const drawerTriggerRef = useRef(null);
  const { setIsAppLoading } = useContext(AppLoadingContext);

  const hasDataFn = useCallback((shape) => {
    if (!shape?.length) {
      return false;
    }
    const [traceOne, traceTwo] = shape;
    return traceOne.y.some((y) => y > 0) || traceTwo.y.some((y) => y > 0);
  }, []);

  useEffect(() => {
    if (loading) {
      setIsAppLoading(true);
    } else {
      setIsAppLoading(false);
    }
  }, [loading, setIsAppLoading]);

  const subtitle = (
    <div className="margin-bottom-3">
      <WidgetContainerSubtitle marginY={0}>
        Active noncompliant citations addressed in approved Activity Reports (AR) compared against
        all active areas of noncompliance.
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
      <Drawer triggerRef={drawerTriggerRef} title="Active noncompliant citations with TTA support">
        <ContentFromFeedByTag tagName="ttahub-active-noncompliant-citation" />
      </Drawer>

      <LineGraphWidget
        className="active-noncompliant-citations-with-tta-support-widget"
        title="Active noncompliant citations with TTA support"
        exportName={EXPORT_NAME}
        data={data}
        xAxisTitle="Activity report start date"
        yAxisTitle="Number of noncompliant citations"
        tableTitle="Active noncompliant citations"
        tableFirstHeading="Noncompliant citations"
        subtitle={subtitle}
        legendConfig={deriveLineGraphLegendConfig(data, DEFAULT_LEGEND_CONFIG)}
        drawerConfig={{
          tagName: 'ttahub-regional-dash-monitoring-filters',
          title: 'Monitoring dashboard filters',
        }}
        hasDataFn={hasDataFn}
      />
    </>
  );
}

ActiveNoncompliantCitationsWithTtaSupportWidget.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        x: PropTypes.arrayOf(PropTypes.string),
        y: PropTypes.arrayOf(PropTypes.number),
      })
    ),
    PropTypes.shape({}),
  ]),
  loading: PropTypes.bool.isRequired,
};

ActiveNoncompliantCitationsWithTtaSupportWidget.defaultProps = {
  data: [
    {
      name: 'Active areas of noncompliance with TTA support',
      x: [],
      y: [],
      month: [],
    },
    {
      name: 'All active areas of noncompliance',
      x: [],
      y: [],
      month: [],
    },
  ],
};

export default withWidgetData(
  ActiveNoncompliantCitationsWithTtaSupportWidget,
  'activeNoncompliantCitationsWithTtaSupport'
);
