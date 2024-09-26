import React, {
  useContext,
  useRef,
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
import DrawerTriggerButton from '../../components/DrawerTriggerButton';
import Drawer from '../../components/Drawer';
import ContentFromFeedByTag from '../../components/ContentFromFeedByTag';
import PercentageActivityReportByRole from '../../widgets/PercentageActivityReportByRole';
import RootCauseFeiGoals from '../../widgets/RootCauseFeiGoals';

const DISALLOWED_FILTERS = [
  'domainClassroomOrganization',
  'domainEmotionalSupport',
  'domainInstructionalSupport',
];
const ALLOWED_SUBFILTERS = QA_DASHBOARD_FILTER_CONFIG.map(({ id }) => id)
  .filter((id) => !DISALLOWED_FILTERS.includes(id));

const DELIVERY_METHOD_GRAPH_DATA = {
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

const ROLE_GRAPH_DATA = {
  totalNumberOfReports: 11510,
  totalPercentage: 100,
  records: [
    {
      role_name: 'ECM',
      role_count: 6,
      percentage: 1,
    },
    {
      role_name: 'ECS',
      role_count: 6892,
      percentage: 58,
    },
    {
      role_name: 'FES',
      role_count: 135,
      percentage: 2,
    },
    {
      role_name: 'GS',
      role_count: 4258,
      percentage: 36,
    },
    {
      role_name: 'GSM',
      role_count: 23,
      percentage: 1,
    },
    {
      role_name: 'HS',
      role_count: 153,
      percentage: 2,
    },
    {
      role_name: 'SS',
      role_count: 0,
      percentage: 0,
    },
    {
      role_name: 'TTAC',
      role_count: 0,
      percentage: 0,
    },
  ],
};

const ROOT_CAUSE_FEI_GOALS_DATA = {
  totalNumberOfGoals: 11510,
  totalNumberOfRootCauses: 21637,
  records: [
    {
      rootCause: 'Community Partnerships',
      response_count: 2532,
      percentage: 22,
    },
    {
      rootCause: 'Facilities',
      response_count: 2186,
      percentage: 19,
    },
    {
      rootCause: 'Family Circumstances',
      response_count: 2762,
      percentage: 24,
    },
    {
      rootCause: 'Other ECE Care Options',
      response_count: 3683,
      percentage: 32,
    },
    {
      rootCause: 'Unavailable',
      response_count: 115,
      percentage: 1,
    },
    {
      rootCause: 'Workforce',
      response_count: 10359,
      percentage: 90,
    },
  ],
};

export default function QADashboard() {
  const { user } = useContext(UserContext);
  const drawerTriggerRef = useRef(null);
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
        <div className="margin-bottom-3">
          <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>
            Learn how filters impact the data displayed
          </DrawerTriggerButton>
          <Drawer title="QA dashboard filters" triggerRef={drawerTriggerRef}>
            <ContentFromFeedByTag tag="ttahub-qa-dash-filters" />
          </Drawer>
        </div>
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
              data={DELIVERY_METHOD_GRAPH_DATA}
              loading={false}
            />
          </Grid>
          <Grid row gap={2}>
            <Grid desktop={{ col: 6 }} mobile={{ col: 12 }}>
              <PercentageActivityReportByRole data={ROLE_GRAPH_DATA} />
            </Grid>
            <Grid desktop={{ col: 6 }} mobile={{ col: 12 }}>
              <RootCauseFeiGoals data={ROOT_CAUSE_FEI_GOALS_DATA} />
            </Grid>
          </Grid>

        </div>
      </div>
    </>
  );
}
