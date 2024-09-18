import React, {
  useContext,
} from 'react';
import { Helmet } from 'react-helmet';
import {
  Grid,
} from '@trussworks/react-uswds';
import QAOverview from '../../widgets/QualityAssuranceDashboardOverview';
import DeliveryMethod from '../../widgets/DeliveryMethodGraph';
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

const DATA = {
  total_in_person_count: 8420,
  average_in_person_percentage: 73,
  total_virtual_count: 2734,
  average_virtual_percentage: 24,
  total_hybrid_count: 356,
  average_hybrid_percentage: 3,
  records: [{
    month: 'Jan 23',
    in_person_count: 818,
    hybrid_count: 0,
    in_person_percentage: 80,
    virtual_count: 204,
    virtual_percentage: 20,
    hybrid_percentage: 0,
  },
  {
    month: 'Feb 23',
    in_person_count: 1750,
    virtual_count: 174,
    hybrid_count: 0,
    in_person_percentage: 83,
    virtual_percentage: 17,
    hybrid_percentage: 0,
  },
  {
    month: 'Mar 23',
    in_person_count: 742,
    virtual_count: 143,
    hybrid_count: 1,
    in_person_percentage: 83,
    virtual_percentage: 16,
    hybrid_percentage: 1,
  },
  {
    month: 'Apr 23',
    in_person_count: 936,
    virtual_count: 255,
    hybrid_count: 24,
    in_person_percentage: 77,
    virtual_percentage: 16,
    hybrid_percentage: 1,
  },
  {
    month: 'May 23',
    in_person_count: 742,
    virtual_count: 191,
    hybrid_count: 29,
    in_person_percentage: 77,
    virtual_percentage: 20,
    hybrid_percentage: 3,
  },
  {
    month: 'Jun 23',
    in_person_count: 650,
    in_person_percentage: 83,
    virtual_count: 102,
    virtual_percentage: 13,
    hybrid_count: 31,
    hybrid_percentage: 4,
  },
  {
    month: 'Jul 23',
    in_person_count: 827,
    in_person_percentage: 84,
    virtual_count: 138,
    virtual_percentage: 13,
    hybrid_count: 20,
    hybrid_percentage: 2,
  }, {
    month: 'Aug 23',
    in_person_count: 756,
    in_person_percentage: 76,
    virtual_count: 206,
    virtual_percentage: 21,
    hybrid_count: 20,
    hybrid_percentage: 2,
  },
  {
    month: 'Sep 23',
    in_person_count: 699,
    in_person_percentage: 73,
    virtual_count: 258,
    virtual_percentage: 26,
    hybrid_count: 0,
    hybrid_percentage: 0,
  },
  {
    month: 'Oct 23',
    in_person_count: 855,
    in_person_percentage: 82,
    virtual_count: 177,
    virtual_percentage: 17,
    hybrid_count: 11,
    hybrid_percentage: 1,
  },
  {
    month: 'Nov 23',
    in_person_count: 803,
    in_person_percentage: 79,
    virtual_count: 290,
    virtual_percentage: 16,
    hybrid_count: 78,
    hybrid_percentage: 5,
  },
  {
    month: 'Dec 23',
    in_person_count: 689,
    in_person_percentage: 69,
    virtual_count: 596,
    virtual_percentage: 29,
    hybrid_count: 64,
    hybrid_percentage: 2,
  },
  ],
};

export default function QADashboard() {
  const { user } = useContext(UserContext);
  const {
    // from useUserDefaultRegionFilters
    regions,

    // filter functionality
    filters,
    filterConfig,
    onApplyFilters,
    onRemoveFilter,
  } = useFilters(
    user,
    QA_DASHBOARD_FILTER_KEY,
    true,
    [],
    QA_DASHBOARD_FILTER_CONFIG,
  );

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
            filterConfig={filterConfig}
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
          loading={false}
        />

        <div>
          <Grid row>
            <DeliveryMethod
              data={DATA}
              loading={false}
            />
          </Grid>
        </div>
      </div>
    </>
  );
}
