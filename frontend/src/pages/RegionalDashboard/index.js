import React, {
  useMemo,
  useContext,
  useState,
} from 'react';
import ReactRouterPropTypes from 'react-router-prop-types';
import FilterPanel from '../../components/filter/FilterPanel';
import FilterPanelContainer from '../../components/filter/FilterPanelContainer';
import { hasApproveActivityReport } from '../../permissions';
import UserContext from '../../UserContext';
import { DASHBOARD_FILTER_CONFIG } from './constants';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import { showFilterWithMyRegions } from '../regionHelpers';
import { regionFilter, specialistNameFilter } from '../../components/filter/activityReportFilters';
import FeatureFlag from '../../components/FeatureFlag';
import useFilters from '../../hooks/useFilters';
import './index.css';
import TabsNav from '../../components/TabsNav';
import Dashboard from './components/Dashboard';
import useDashboardFilterKey from '../../hooks/useDashboardFilterKey';

const pageConfig = () => ({
  'training-reports': {
    h1Text: 'Regional dashboard - Training Reports',
    showFilters: false,
  },
  'all-reports': {
    h1Text: 'Regional dashboard - All reports',
    showFilters: false,
  },
  'activity-reports': {
    h1Text: 'Regional dashboard - Activity Reports',
    showFilters: true,
  },
  default: {
    h1Text: 'Regional TTA activity dashboard',
    showFilters: true,
  },
});

const links = [
  {
    to: '/dashboards/regional-dashboard/activity-reports',
    label: 'Activity Reports',
  },
  {
    to: '/dashboards/regional-dashboard/training-reports',
    label: 'Training Reports',
  },
  /*
  {
    to: '/dashboards/regional-dashboard/all-reports',
    label: 'All reports',
  },
  */
];

export default function RegionalDashboard({ match }) {
  const { user } = useContext(UserContext);
  const [resetPagination, setResetPagination] = useState(false);

  const { reportType } = match.params;
  const filterKey = useDashboardFilterKey('regional-dashboard', reportType || 'activityReports');

  const {
    // from useUserDefaultRegionFilters
    regions,
    defaultRegion,
    allRegionsFilters,
    userHasOnlyOneRegion,

    // filter functionality
    filters,
    setFilters,
    onApplyFilters,
    onRemoveFilter,
  } = useFilters(
    user,
    filterKey,
    true,
  );

  const {
    h1Text,
    showFilters,
  // eslint-disable-next-line max-len
  } = pageConfig(userHasOnlyOneRegion, defaultRegion)[reportType] || pageConfig(userHasOnlyOneRegion, defaultRegion).default;

  const filtersToUse = useMemo(() => {
    const filterConfig = [...DASHBOARD_FILTER_CONFIG];

    if (!userHasOnlyOneRegion) {
      filterConfig.push(regionFilter);
    }

    // If user has approve activity report permission add 'Specialist name' filter.
    if (hasApproveActivityReport(user)) {
      filterConfig.push(specialistNameFilter);
      filterConfig.sort((a, b) => a.display.localeCompare(b.display));
    }
    return filterConfig;
  }, [user, userHasOnlyOneRegion]);

  return (
    <div className="ttahub-dashboard">
      <RegionPermissionModal
        filters={filters}
        user={user}
        showFilterWithMyRegions={
          () => showFilterWithMyRegions(allRegionsFilters, filters, setFilters)
        }
      />
      <FeatureFlag flag="training_reports_dashboard">
        <TabsNav ariaLabel="Dashboard navigation" links={links} />
      </FeatureFlag>
      <h1 className="landing margin-top-0 margin-bottom-3">
        {h1Text}
      </h1>
      {showFilters && (
      <FilterPanelContainer>
        <FilterPanel
          applyButtonAria="apply filters for regional dashboard"
          filters={filters}
          onApplyFilters={onApplyFilters}
          onRemoveFilter={onRemoveFilter}
          filterConfig={filtersToUse}
          allUserRegions={regions}
        />
      </FilterPanelContainer>
      )}
      <Dashboard
        reportType={reportType}
        setResetPagination={setResetPagination}
        filters={filters}
        filterKey={filterKey}
        resetPagination={resetPagination}
      />
    </div>
  );
}

RegionalDashboard.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};
