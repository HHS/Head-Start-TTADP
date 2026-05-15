import { Grid } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React from 'react';
import ActiveDeficientCitationsWithTtaSupport from '../../../widgets/ActiveDeficientCitationsWithTtaSupport';
import ActiveNoncompliantCitationsWithTtaSupport from '../../../widgets/ActiveNoncompliantCitationsWithTtaSupport';
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
        <ActiveDeficientCitationsWithTtaSupport filters={filtersToApply} />
      </Grid>
      <FeatureFlag flag="monitoring-regional-dashboard">
        <Grid row>
          <ActiveNoncompliantCitationsWithTtaSupport filters={filtersToApply} />
        </Grid>
      </FeatureFlag>
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
