import moment from 'moment';
import React, { useContext, useMemo, useState } from 'react';
import ReactRouterPropTypes from 'react-router-prop-types';
import { v4 as uuidv4 } from 'uuid';
import { specialistNameFilter } from '../../components/filter/activityReportFilters';
import FilterPanel from '../../components/filter/FilterPanel';
import FilterPanelContainer from '../../components/filter/FilterPanelContainer';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import TabsNav from '../../components/TabsNav';
import useDashboardFilterKey from '../../hooks/useDashboardFilterKey';
import useFilters from '../../hooks/useFilters';
import { hasApproveActivityReport } from '../../permissions';
import UserContext from '../../UserContext';
import { formatDateRange } from '../../utils';
import { showFilterWithMyRegions } from '../regionHelpers';
import Dashboard from './components/Dashboard';
import {
  DASHBOARD_FILTER_CONFIG,
  MONITORING_FILTER_CONFIG,
  RECIPIENT_SPOTLIGHT_FILTER_CONFIG,
} from './constants';
import './index.css';

const filterConfiguration = {
  'recipient-spotlight': {
    config: RECIPIENT_SPOTLIGHT_FILTER_CONFIG,
    defaultFilters: () => [],
    allowSpecialistNameFilter: false,
  },
  monitoring: {
    config: MONITORING_FILTER_CONFIG,
    defaultFilters: () => {
      const todayMinus12Months = moment().subtract(12, 'months').format('YYYY/MM/DD');
      const defaultDate = formatDateRange({
        forDateTime: true,
        string: `${todayMinus12Months}-${moment().format('YYYY/MM/DD')}`,
        withSpaces: false,
      });

      return [
        {
          id: uuidv4(),
          topic: 'startDate',
          condition: 'is within',
          query: defaultDate,
        },
      ];
    },
    allowSpecialistNameFilter: false,
  },
  default: {
    config: DASHBOARD_FILTER_CONFIG,
    defaultFilters: () => [],
    allowSpecialistNameFilter: true,
  },
};

const pageConfig = () => ({
  'training-reports': {
    h1Text: 'Regional dashboard - Training Reports',
    showFilters: false,
  },
  'all-reports': {
    h1Text: 'Regional dashboard - All reports',
    showFilters: false,
  },
  'recipient-spotlight': {
    h1Text: 'Regional dashboard - Recipient spotlight',
    showFilters: true,
  },
  monitoring: {
    h1Text: 'Regional dashboard - Monitoring',
    showFilters: true,
  },
  'activity-reports': {
    h1Text: 'Regional dashboard - Activity Reports',
    showFilters: true,
  },
  default: {
    h1Text: 'Regional dashboard - Activity Reports',
    showFilters: true,
  },
});

export const links = [
  {
    to: '/dashboards/regional-dashboard/activity-reports',
    label: 'Activity Reports',
  },
  {
    to: '/dashboards/regional-dashboard/training-reports',
    label: 'Training Reports',
  },
  {
    to: '/dashboards/regional-dashboard/monitoring',
    label: 'Monitoring',
  },
  {
    to: '/dashboards/regional-dashboard/recipient-spotlight',
    label: 'Recipient spotlight',
  },
];

function RegionalDashboardContent({ match }) {
  const { user } = useContext(UserContext);
  const [resetPagination, setResetPagination] = useState(false);

  const { reportType } = match.params;
  const filterKey = useDashboardFilterKey('regional-dashboard', reportType || 'activityReports');

  // Determine which filter config to use based on report type
  const filterConfigToUse = filterConfiguration[reportType] || filterConfiguration.default;
  const { config, defaultFilters, allowSpecialistNameFilter } = filterConfigToUse;

  const defaultFiltersTouse = useMemo(() => defaultFilters(), [defaultFilters]);

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
    filterConfig,
  } = useFilters(user, filterKey, true, defaultFiltersTouse, config);

  const {
    h1Text,
    showFilters,
    // eslint-disable-next-line max-len
  } =
    pageConfig(userHasOnlyOneRegion, defaultRegion)[reportType] ||
    pageConfig(userHasOnlyOneRegion, defaultRegion).default;

  const filtersToUse = useMemo(() => {
    const config = [...filterConfig];

    // If user has approve activity report permission add 'Specialist name' filter.
    // Exclude specialist name filter from recipient spotlight
    if (allowSpecialistNameFilter && hasApproveActivityReport(user)) {
      config.push(specialistNameFilter);
      config.sort((a, b) => a.display.localeCompare(b.display));
    }
    return config;
  }, [filterConfig, user, allowSpecialistNameFilter]);

  return (
    <div className="ttahub-dashboard">
      <RegionPermissionModal
        filters={filters}
        user={user}
        showFilterWithMyRegions={() =>
          showFilterWithMyRegions(allRegionsFilters, filters, setFilters)
        }
      />
      <TabsNav ariaLabel="Dashboard navigation" links={links} />
      <h1 className="landing margin-top-0 margin-bottom-3">{h1Text}</h1>
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
        userHasOnlyOneRegion={userHasOnlyOneRegion}
      />
    </div>
  );
}

RegionalDashboardContent.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};

export default function RegionalDashboard({ match }) {
  const { reportType } = match.params;
  return <RegionalDashboardContent key={reportType || 'default'} match={match} />;
}

RegionalDashboard.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};
