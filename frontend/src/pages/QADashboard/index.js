import React, {
  useContext,
  useState,
  useMemo,
} from 'react';
import { Helmet } from 'react-helmet';
import QAOverview from '../../widgets/QualityAssuranceDashboardOverview';
import { regionFilter } from '../../components/filter/activityReportFilters';
import useFilters from '../../hooks/useFilters';
import UserContext from '../../UserContext';
import FilterPanel from '../../components/filter/FilterPanel';
import FilterPanelContainer from '../../components/filter/FilterPanelContainer';
import { QA_DASHBOARD_FILTER_KEY, QA_DASHBOARD_FILTER_CONFIG } from './constants';

const DISALLOWED_FILTERS = [
  'domainClassroomOrganization',
  'domainEmotionalSupport',
  'domainInstructionalSupport',
];
const ALLOWED_SUBFILTERS = QA_DASHBOARD_FILTER_CONFIG.map(({ id }) => id)
  .filter((id) => !DISALLOWED_FILTERS.includes(id));

export default function QADashboard() {
  const { user } = useContext(UserContext);
  const {
    // from useUserDefaultRegionFilters
    regions,
    userHasOnlyOneRegion,
    // defaultRegion,
    // allRegionsFilters,

    // filter functionality
    filters,
    // setFilters,
    onApplyFilters,
    onRemoveFilter,
  } = useFilters(
    user,
    QA_DASHBOARD_FILTER_KEY,
    true,
  );

  const filtersToUse = useMemo(() => {
    const filterConfig = [...QA_DASHBOARD_FILTER_CONFIG];

    if (!userHasOnlyOneRegion) {
      filterConfig.push(regionFilter);
    }

    return filterConfig;
  }, [userHasOnlyOneRegion]);
  const [isLoading] = useState(false);

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
            allowedSubfilters={ALLOWED_SUBFILTERS}
          />
        </FilterPanelContainer>
        <QAOverview
          data={{
            recipientsWithNoTTA: { pct: '2.52%', filterApplicable: true },
            recipientsWithOhsStandardFeiGoals: { pct: '73.25%', filterApplicable: false },
            recipientsWithOhsStandardClass: { pct: '14.26%', filterApplicable: false },
          }}
          loading={isLoading}
        />
      </div>
    </>
  );
}
