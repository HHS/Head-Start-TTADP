import PropTypes from 'prop-types';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import AppLoadingContext from '../AppLoadingContext';
import ContentFromFeedByTag from '../components/ContentFromFeedByTag';
import Drawer from '../components/Drawer';
import DrawerTriggerButton from '../components/DrawerTriggerButton';
import WidgetContainer from '../components/WidgetContainer';
import WidgetContainerSubtitle from '../components/WidgetContainer/WidgetContainerSubtitle';
import useMediaCapture from '../hooks/useMediaCapture';
import useWidgetMenuItems from '../hooks/useWidgetMenuItems';
import HorizontalTableWidget from './HorizontalTableWidget';
import withWidgetData from './withWidgetData';
import './CompliantFollowUpReviewsWithTtaSupport.css';
import NoResultsFound from '../components/NoResultsFound';

const EXPORT_NAME = 'Compliant follow-up reviews with TTA support';

export function CompliantFollowUpReviewsWithTtaSupport({ loading, data }) {
  const { setIsAppLoading } = useContext(AppLoadingContext);
  const drawerTriggerRef = useRef(null);
  const capture = useMediaCapture(EXPORT_NAME);
  const [showTabularData, setShowTabularData] = useState(true);

  useEffect(() => {
    setIsAppLoading(loading);
  }, [loading, setIsAppLoading]);

  const months = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.months;
  }, [data]);

  // Build rows for HorizontalTableWidget (table view / export)
  const tableData = useMemo(() => {
    return (
      data?.reviews?.map((row) => ({
        heading: row.name,
        id: row.name,
        tooltip: true,
        hideSortingIndicator: true,
        data: [
          ...row.values.map((value) => ({
            value: value.toString(),
          })),
          {
            value: row.values.reduce((sum, v) => sum + Number(v), 0).toString(),
          },
        ],
      })) || []
    );
  }, [data]);

  // Placeholder menu items until export is implemented
  // const { exportRows } = useWidgetExport(
  //     tableData,
  //     [...months, 'Total'],
  //     {},
  //     'Finding category',
  //     EXPORT_NAME
  //   );

  const menuItems = useWidgetMenuItems(
    showTabularData,
    setShowTabularData,
    capture,
    {}
    // exportRows
  );

  const subtitle = (
    <div className="margin-bottom-3">
      <WidgetContainerSubtitle>
        Compliant follow-up reviews, broken out by those with and without citations addressed by
        approved activity reports during the correction period.
      </WidgetContainerSubtitle>
      <div className="margin-top-1">
        <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>
          About this data
        </DrawerTriggerButton>
      </div>
    </div>
  );

  const showEmptyState = loading || !data || data.length === 0;

  if (showEmptyState) {
    return (
      <>
        <Drawer triggerRef={drawerTriggerRef} title="Compliant Follow-up Reviews with TTA Support">
          <ContentFromFeedByTag tagName="ttahub-compliant-follow-up-reviews-with-tta-support" />
        </Drawer>
        <WidgetContainer
          title="Compliant Follow-up Reviews with TTA Support"
          subtitle={subtitle}
          menuItems={[]}
          loading={loading}
          titleMargin={{ bottom: 1 }}
        >
          <NoResultsFound
            drawerConfig={{
              tagName: 'ttahub-regional-dash-monitoring-filters',
              title: 'Monitoring dashboard filters',
            }}
          />
        </WidgetContainer>
      </>
    );
  }

  return (
    <>
      <Drawer triggerRef={drawerTriggerRef} title="Compliant Follow-up Reviews with TTA Support">
        <ContentFromFeedByTag tagName="ttahub-compliant-follow-up-reviews-with-tta-support" />
      </Drawer>
      <WidgetContainer
        title="Compliant Follow-up Reviews with TTA Support"
        subtitle={subtitle}
        menuItems={menuItems}
        loading={loading}
        titleMargin={{ bottom: 1 }}
      >
        {showTabularData ? (
          <HorizontalTableWidget
            headers={months}
            data={tableData}
            caption="Compliant Follow-up Reviews"
            firstHeading="Follow-up reviews"
            lastHeading="Totals"
            showTotalColumn
            stickyFirstColumn
            stickyLastColumn
            enableCheckboxes={false}
            selectAllIdPrefix="compliant-follow-up-reviews"
            hideFirstColumnBorder
            footerData={false}
          />
        ) : (
          <CompliantReviewsGrid data={data} />
        )}
      </WidgetContainer>
    </>
  );
}

CompliantFollowUpReviewsWithTtaSupport.propTypes = {
  filters: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};

CompliantFollowUpReviewsWithTtaSupport.defaultProps = {
  data: [],
};

export default withWidgetData(
  CompliantFollowUpReviewsWithTtaSupport,
  'compliantFollowUpReviewsWithTtaSupport'
);
