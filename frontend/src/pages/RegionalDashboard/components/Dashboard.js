import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { GridContainer } from '@trussworks/react-uswds';
import ActivityReportDashboard from './ActivityReportDashboard';
import TrainingReportDashboard from './TrainingReportDashboard';
import AllReports from './AllReports';
import RecipientSpotlightDashboard from './RecipientSpotlightDashboard';
import { expandFilters } from '../../../utils';

export default function Dashboard({
  reportType,
  filters,
  resetPagination,
  setResetPagination,
  filterKey,
  userHasOnlyOneRegion,
}) {
  const filtersToApply = useMemo(() => expandFilters(filters), [filters]);

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
