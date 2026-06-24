import { Grid } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React from 'react';
import FeatureFlag from '../../../components/FeatureFlag';
import ActiveDeficientCitationsWithTtaSupport from '../../../widgets/ActiveDeficientCitationsWithTtaSupport';
import ActiveNoncompliantCitationsWithTtaSupport from '../../../widgets/ActiveNoncompliantCitationsWithTtaSupport';
import CompliantFollowUpReviewsWithTtaSupport from '../../../widgets/CompliantFollowUpReviewsWithTtaSupport';
import FindingCategoryHotspot from '../../../widgets/FindingCategoryHotspot';
import MonitoringRelatedTta from '../../../widgets/MonitoringRelatedTta';
import MonitoringReportDashboardOverview from '../../../widgets/MonitoringReportDashboardOverview';

export default function MonitoringReportDashboard({ filtersToApply }) {
  return (
    <>
      <Grid row gap>
        <MonitoringReportDashboardOverview filters={filtersToApply} loading={false} />
      </Grid>
      <Grid row>
        <FeatureFlag flag="compliant_follow_up_reviews_tta_support">
          <CompliantFollowUpReviewsWithTtaSupport filters={filtersToApply} />
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
        <MonitoringRelatedTta filters={filtersToApply} />
      </Grid>
    </>
  );
}

MonitoringReportDashboard.propTypes = {
  filtersToApply: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};
