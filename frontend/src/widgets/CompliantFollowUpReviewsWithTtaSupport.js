import { Link } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import AppLoadingContext from '../AppLoadingContext';
import ContentFromFeedByTag from '../components/ContentFromFeedByTag';
import Drawer from '../components/Drawer';
import DrawerTriggerButton from '../components/DrawerTriggerButton';
import WidgetContainer from '../components/WidgetContainer';
import WidgetContainerSubtitle from '../components/WidgetContainer/WidgetContainerSubtitle';
import useMediaCapture from '../hooks/useMediaCapture';
import useWidgetExport from '../hooks/useWidgetExport';
import useWidgetMenuItems from '../hooks/useWidgetMenuItems';
import CompliantReviewsGrid from './CompliantReviewsGrid';
import HorizontalTableWidget from './HorizontalTableWidget';
import withWidgetData from './withWidgetData';
import './CompliantFollowUpReviewsWithTtaSupport.css';
import NoResultsFound from '../components/NoResultsFound';

const EXPORT_NAME = 'Compliant follow-up reviews with TTA support';

export function CompliantFollowUpReviewsWithTtaSupport({ loading, data }) {
  const { setIsAppLoading } = useContext(AppLoadingContext);
  const drawerTriggerRef = useRef(null);
  const widgetRef = useRef(null);
  const capture = useMediaCapture(widgetRef, EXPORT_NAME);
  const [showTabularData, setShowTabularData] = useState(false);

  useEffect(() => {
    setIsAppLoading(loading);
  }, [loading, setIsAppLoading]);

  const months = useMemo(() => {
    if (!data?.months?.length) return [];
    return data.months;
  }, [data]);

  // Build rows for HorizontalTableWidget (table view / export)
  // Separate non-Total rows from the Total row so it can go in tfoot (bold)
  const { tableData, footerData } = useMemo(() => {
    const reviews = data?.reviews || [];
    const nonTotalRows = reviews.filter((row) => !/total/i.test(row.name));
    const totalRow = reviews.find((row) => /total/i.test(row.name));

    const rows = nonTotalRows.map((row) => ({
      heading: row.name,
      id: row.name,
      tooltip: true,
      hideSortingIndicator: true,
      data: [
        ...row.values.map((value) => ({ value: value.toString() })),
        { value: row.values.reduce((sum, v) => sum + Number(v), 0).toString() },
      ],
    }));

    const footer = totalRow
      ? [
          'Total',
          ...totalRow.values.map(String),
          totalRow.values.reduce((sum, v) => sum + Number(v), 0).toString(),
        ]
      : false;

    return { tableData: rows, footerData: footer };
  }, [data]);

  const { exportRows } = useWidgetExport(
    tableData,
    [...(months || []), 'Total'],
    {},
    'Follow-up reviews',
    EXPORT_NAME
  );

  const menuItems = useWidgetMenuItems(
    showTabularData,
    setShowTabularData,
    capture,
    {},
    exportRows
  );

  const subtitle = (
    <div className="margin-bottom-3">
      <WidgetContainerSubtitle>
        Compliant follow-up reviews, broken out by those with and without citations addressed by
        approved activity reports during the correction period.
      </WidgetContainerSubtitle>
      <div className="margin-top-1">
        <Link
          href="/dashboards/regional-dashboard/monitoring-report/compliant-follow-up-reviews"
          className="usa-link"
        >
          Display details
        </Link>
        &nbsp;&nbsp;&nbsp;
        <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>
          About this data
        </DrawerTriggerButton>
      </div>
    </div>
  );

  const showEmptyState = !loading && !data?.months?.length;
  if (showEmptyState) {
    return (
      <>
        <Drawer triggerRef={drawerTriggerRef} title="Compliant follow-up reviews with TTA support">
          <ContentFromFeedByTag tagName="ttahub-compliant-follow-up-reviews" />
        </Drawer>
        <WidgetContainer
          title="Compliant follow-up reviews with TTA support"
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
      <Drawer triggerRef={drawerTriggerRef} title="Compliant follow-up reviews with TTA support">
        <ContentFromFeedByTag tagName="ttahub-compliant-follow-up-reviews" />
      </Drawer>
      <WidgetContainer
        title="Compliant follow-up reviews with TTA support"
        subtitle={subtitle}
        menuItems={menuItems}
        loading={loading}
        titleMargin={{ bottom: 1 }}
      >
        {showTabularData ? (
          <HorizontalTableWidget
            headers={months}
            data={tableData}
            caption="Compliant follow-up reviews with TTA support"
            firstHeading="Follow-up reviews"
            lastHeading="Totals"
            showTotalColumn
            stickyFirstColumn
            stickyLastColumn
            enableCheckboxes={false}
            selectAllIdPrefix="compliant-follow-up-reviews"
            hideFirstColumnBorder
            footerData={footerData}
          />
        ) : (
          <CompliantReviewsGrid data={data} widgetRef={widgetRef} />
        )}
      </WidgetContainer>
    </>
  );
}

CompliantFollowUpReviewsWithTtaSupport.propTypes = {
  data: PropTypes.shape({
    months: PropTypes.arrayOf(PropTypes.string),
    reviews: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        values: PropTypes.arrayOf(PropTypes.number),
      })
    ),
  }),
  loading: PropTypes.bool.isRequired,
  filters: PropTypes.arrayOf(PropTypes.shape({})),
};

CompliantFollowUpReviewsWithTtaSupport.defaultProps = {
  data: null,
  filters: [],
};

export default withWidgetData(
  CompliantFollowUpReviewsWithTtaSupport,
  'compliantFollowUpReviewsWithTtaSupport'
);
