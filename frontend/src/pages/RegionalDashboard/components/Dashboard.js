import { GridContainer } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React, { useMemo } from 'react';
import { expandFilters, expandMonitoringFilters } from '../../../utils';
import ActivityReportDashboard from './ActivityReportDashboard';
import AllReports from './AllReports';
import MonitoringReportDashboard from './MonitoringReportDashboard';
import RecipientSpotlightDashboard from './RecipientSpotlightDashboard';
import TrainingReportDashboard from './TrainingReportDashboard';

const EXPANSION_FUNCTION = {
  monitoring: expandMonitoringFilters,
  default: expandFilters,
};

export default function Dashboard({
  reportType,
  filters,
  resetPagination,
  setResetPagination,
  filterKey,
  userHasOnlyOneRegion,
}) {
  const filtersToApply = useMemo(() => {
    const expandFunction = EXPANSION_FUNCTION[reportType] || EXPANSION_FUNCTION.default;
    return expandFunction(filters);
  }, [filters, reportType]);

  let DashboardComponent = ActivityReportDashboard;
  switch (reportType) {
    case 'training-reports':
      DashboardComponent = TrainingReportDashboard;
      break;
    case 'all-reports':
      DashboardComponent = AllReports;
      break;
    case 'recipient-spotlight':
      DashboardComponent = RecipientSpotlightDashboard;
      break;
    case 'monitoring':
      DashboardComponent = MonitoringReportDashboard;
      break;
    default:
      break;
  }

  return (
    <GridContainer className="margin-0 padding-0">
      <DashboardComponent
        filtersToApply={filtersToApply}
        resetPagination={resetPagination}
        setResetPagination={setResetPagination}
        filterKey={filterKey}
        userHasOnlyOneRegion={userHasOnlyOneRegion}
      />
    </GridContainer>
  );
}

Dashboard.propTypes = {
  filters: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  resetPagination: PropTypes.bool.isRequired,
  setResetPagination: PropTypes.func.isRequired,
  filterKey: PropTypes.string.isRequired,
  reportType: PropTypes.string,
  userHasOnlyOneRegion: PropTypes.bool.isRequired,
};

Dashboard.defaultProps = {
  reportType: 'activityReport',
};
