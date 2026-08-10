import { Grid } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React, { useMemo, useRef } from 'react';
import ContentFromFeedByTag from '../../../components/ContentFromFeedByTag';
import Drawer from '../../../components/Drawer';
import DrawerTriggerButton from '../../../components/DrawerTriggerButton';
import FeatureFlag from '../../../components/FeatureFlag';
import ActiveDeficientCitationsWithTtaSupport from '../../../widgets/ActiveDeficientCitationsWithTtaSupport';
import ActiveNoncompliantCitationsWithTtaSupport from '../../../widgets/ActiveNoncompliantCitationsWithTtaSupport';
import CompliantFollowUpReviewsWithTtaSupport from '../../../widgets/CompliantFollowUpReviewsWithTtaSupport';
import FindingCategoryHotspot from '../../../widgets/FindingCategoryHotspot';
import MonitoringRelatedTta from '../../../widgets/MonitoringRelatedTta';
import MonitoringReportDashboardOverview from '../../../widgets/MonitoringReportDashboardOverview';
import { formatMonitoringFiltersForQuery } from '../monitoringFilters';

export default function MonitoringReportDashboard({ filtersToApply }) {
  const pageDrawerRef = useRef(null);

  const detailsFilters = useMemo(
    () => formatMonitoringFiltersForQuery(filtersToApply, { includeCompleteDate: true }),
    [filtersToApply]
  );
  const relatedTtaFilters = useMemo(
    () => formatMonitoringFiltersForQuery(filtersToApply),
    [filtersToApply]
  );

  return (
    <>
      <div className="margin-bottom-3">
        <DrawerTriggerButton drawerTriggerRef={pageDrawerRef}>
          Learn how filters impact the data displayed
        </DrawerTriggerButton>
        <Drawer title="Filter guidance" triggerRef={pageDrawerRef}>
          <ContentFromFeedByTag tagName="ttahub-regional-dash-monitoring-filters" />
        </Drawer>
      </div>

      <Grid row gap>
        <MonitoringReportDashboardOverview filters={filtersToApply} loading={false} />
      </Grid>
      <Grid row>
        <FeatureFlag flag="compliant_follow_up_reviews_tta_support">
          <CompliantFollowUpReviewsWithTtaSupport
            filters={filtersToApply}
            detailsFilters={detailsFilters}
          />
        </FeatureFlag>
      </Grid>
      <Grid row>
        <ActiveDeficientCitationsWithTtaSupport filters={filtersToApply} />
      </Grid>
      <Grid row>
        <ActiveNoncompliantCitationsWithTtaSupport filters={filtersToApply} />
      </Grid>
      <Grid row>
        <FindingCategoryHotspot filters={filtersToApply} />
      </Grid>
      <Grid row>
        <MonitoringRelatedTta filters={relatedTtaFilters} />
      </Grid>
    </>
  );
}

MonitoringReportDashboard.propTypes = {
  filtersToApply: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};
