import { Grid } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React, { useMemo } from 'react';
import FeatureFlag from '../../../components/FeatureFlag';
import ActiveDeficientCitationsWithTtaSupport from '../../../widgets/ActiveDeficientCitationsWithTtaSupport';
import ActiveNoncompliantCitationsWithTtaSupport from '../../../widgets/ActiveNoncompliantCitationsWithTtaSupport';
import CompliantFollowUpReviewsWithTtaSupport from '../../../widgets/CompliantFollowUpReviewsWithTtaSupport';
import FindingCategoryHotspot from '../../../widgets/FindingCategoryHotspot';
import MonitoringRelatedTta from '../../../widgets/MonitoringRelatedTta';
import MonitoringReportDashboardOverview from '../../../widgets/MonitoringReportDashboardOverview';
import { formatMonitoringFiltersForQuery } from '../monitoringFilters';

export default function MonitoringReportDashboard({ filtersToApply }) {
  const detailsFilters = useMemo(
    () => formatMonitoringFiltersForQuery(filtersToApply, { includeCompleteDate: true }),
    [filtersToApply]
  );
  const relatedTtaFilters = useMemo(
    () => filtersToApply.filter((filter) => filter.topic !== 'completeDate'),
    [filtersToApply]
  );

  return (
    <>
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
