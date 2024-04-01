import React from 'react';
import PropTypes from 'prop-types';
import { GridContainer } from '@trussworks/react-uswds';
import ActivityReportDashboard from './ActivityReportDashboard';
import TrainingReportDashboard from './TrainingReportDashboard';
import AllReports from './AllReports';

export default function Dashboard({
  reportType,
  filtersToApply,
  resetPagination,
  setResetPagination,
  filterKey,
}) {
  let DashboardComponent = ActivityReportDashboard;
  switch (reportType) {
    case 'training-reports':
      DashboardComponent = TrainingReportDashboard;
      break;
    case 'all-reports':
      DashboardComponent = AllReports;
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
      />
    </GridContainer>
  );
}

Dashboard.propTypes = {
  filtersToApply: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  resetPagination: PropTypes.bool.isRequired,
  setResetPagination: PropTypes.func.isRequired,
  filterKey: PropTypes.string.isRequired,
  reportType: PropTypes.string,
};

Dashboard.defaultProps = {
  reportType: 'activityReport',
};
