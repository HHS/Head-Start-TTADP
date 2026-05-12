import { Grid } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React from 'react';
import FeatureFlag from '../../../components/FeatureFlag';
import ActiveDeficientCitationsWithTtaSupport from '../../../widgets/ActiveDeficientCitationsWithTtaSupport';
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
          <FindingCategoryHotspot filters={filtersToApply} />
        </Grid>
      </FeatureFlag>
      <Grid row>
        <MonitoringRelatedTta filters={filtersToApply} />
      </Grid>
    </>
  );
}

MonitoringReportDashboard.propTypes = {
  filtersToApply: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};
