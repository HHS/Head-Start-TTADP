import React, {
  useContext,
  useState,
  useMemo,
} from 'react';
import { Helmet } from 'react-helmet';
import { Grid, Alert } from '@trussworks/react-uswds';
import QAOverview from '../../widgets/QualityAssuranceDashboardOverview';
import { regionFilter } from '../../components/filter/activityReportFilters';
import useFilters from '../../hooks/useFilters';
import UserContext from '../../UserContext';
import { DASHBOARD_FILTER_CONFIG } from '../RegionalDashboard/constants';
import FilterPanel from '../../components/filter/FilterPanel';
import FilterPanelContainer from '../../components/filter/FilterPanelContainer';

export default function QADashboard() {
  const { user } = useContext(UserContext);
  const [error] = useState(null);
  const {
    // from useUserDefaultRegionFilters
    regions,
    // defaultRegion,
    // allRegionsFilters,

    // filter functionality
    filters,
    // setFilters,
    onApplyFilters,
    onRemoveFilter,
  } = useFilters(
    user,
    'qa-dashboard',
    true,
  );

  const userHasOnlyOneRegion = useMemo(() => regions.length === 1, [regions]);

  const filtersToUse = useMemo(() => {
    const filterConfig = [...DASHBOARD_FILTER_CONFIG];

    if (!userHasOnlyOneRegion) {
      filterConfig.push(regionFilter);
    }

    return filterConfig;
  }, [userHasOnlyOneRegion]);

  return (
    <>
      <Helmet>
        <title>Quality Assurance Dashboard</title>
      </Helmet>
      <div className="ttahub-dashboard">
        <h1 className="landing margin-top-0 margin-bottom-3">
          Quality assurance dashboard
        </h1>
        <FilterPanelContainer>
          <FilterPanel
            applyButtonAria="apply filters for QA dashboard"
            filters={filters}
            onApplyFilters={onApplyFilters}
            onRemoveFilter={onRemoveFilter}
            filterConfig={filtersToUse}
            allUserRegions={regions}
          />
        </FilterPanelContainer>
        <Grid row>
          {error && (
          <Alert className="margin-bottom-2" type="error" role="alert">
            {error}
          </Alert>
          )}
        </Grid>
        <QAOverview
          data={{
            recipientsWithNoTTA: { pct: '2.52%', filterApplicable: true },
            recipientsWithOhsStandardFeiGoals: { pct: '73.25%', filterApplicable: false },
            recipientsWithOhsStandardClass: { pct: '14.26%', filterApplicable: false },
          }}
          loading={false}
        />
      </div>
    </>
  );
}
