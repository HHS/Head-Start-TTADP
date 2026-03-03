import React, {
  useContext,
  useRef,
  useState,
} from 'react';
import { Helmet } from 'react-helmet';
import useDeepCompareEffect from 'use-deep-compare-effect';
import {
  Grid,
  Alert,
} from '@trussworks/react-uswds';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
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
import ApprovalRateByDeadline from '../../widgets/ApprovalRateByDeadlineWidget';
import { getSelfServiceData, containsFiltersThatAreNotApplicable } from '../../fetchers/ssdi';
import Loader from '../../components/Loader';
import { formatDateRange } from '../../utils';
import './index.scss';

const DISALLOWED_FILTERS = [
  'domainClassroomOrganization',
  'domainEmotionalSupport',
  'domainInstructionalSupport',
];

const ALLOWED_SUBFILTERS = QA_DASHBOARD_FILTER_CONFIG.map(({ id }) => id)
  .filter((id) => !DISALLOWED_FILTERS.includes(id));

const todayMinus12Months = moment().subtract(12, 'months').format('YYYY/MM/DD');
const defaultDate = formatDateRange({
  forDateTime: true,
  string: `${todayMinus12Months}-${moment().format('YYYY/MM/DD')}`,
  withSpaces: false,
});

export default function QADashboard() {
  const { user } = useContext(UserContext);
  const drawerTriggerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, updateError] = useState();
  const [qaData, setQaData] = useState({});

  const additionalDefaultFilters = [
    {
      id: uuidv4(),
      topic: 'startDate',
      condition: 'is within',
      query: defaultDate,
    },
    {
      id: uuidv4(),
      topic: 'createDate',
      condition: 'is within',
      query: defaultDate,
    },
  ];

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
    additionalDefaultFilters,
    QA_DASHBOARD_FILTER_CONFIG,
  );

  // This widget only supports region filtering; other filters are ignored by the API.
  const regionFilters = filters.filter((filter) => filter.topic === 'region');

  useDeepCompareEffect(() => {
    async function fetchQaData() {
      setIsLoading(true);
      // Filters passed also contains region.
      try {
        const [
          recipientsWithNoTtaData,
          feiData,
          classData,
          dashboardData,
        ] = await Promise.all([
          getSelfServiceData(
            'recipients-with-no-tta',
            filters,
            ['no_tta_widget'],
          ),
          getSelfServiceData(
            'recipients-with-ohs-standard-fei-goal',
            filters,
            ['with_fei_widget', 'with_fei_graph'],
          ),
          getSelfServiceData(
            'recipients-with-class-scores-and-goals',
            filters,
            ['with_class_widget'],
          ),
          getSelfServiceData(
            'qa-dashboard',
            filters,
            ['delivery_method_graph', 'role_graph', 'activity_widget'],
          ),
        ]);

        const noTTAContainsFiltersThatAreNotAllowed = containsFiltersThatAreNotApplicable('recipients-with-no-tta', filters);
        const noTTAData = recipientsWithNoTtaData.find((item) => item.data_set === 'no_tta_widget');

        const feiContainsFiltersThatAreNotAllowed = containsFiltersThatAreNotApplicable('recipients-with-ohs-standard-fei-goal', filters);
        const feiOverviewData = feiData.find((item) => item.data_set === 'with_fei_widget');
        const feiGraphData = feiData.find((item) => item.data_set === 'with_fei_graph');

        const rootCauseFeiGoalsGraph = {
          records: feiGraphData.data.sort((a, b) => a.rootCause.localeCompare(b.rootCause)),
          totalNumberOfGoals: feiOverviewData.data.length ? feiOverviewData.data[0].total : 0,
          totalNumberOfRootCauses: feiOverviewData.data.length ? feiOverviewData.data[0]['recipients with fei'] : 0,
          showDashboardFiltersNotApplicable: feiContainsFiltersThatAreNotAllowed,
        };

        const classContainsFiltersThatAreNotAllowed = containsFiltersThatAreNotApplicable('recipients-with-class-scores-and-goals', filters);
        const classOverviewData = classData.find((item) => item.data_set === 'with_class_widget');

        // Build overview data.
        const overviewData = {
          recipientsWithNoTTA: {
            filterApplicable: !noTTAContainsFiltersThatAreNotAllowed,
            pct: noTTAData.data.length > 0 && noTTAData.data[0]['% recipients without tta']
              ? noTTAData.data[0]['% recipients without tta']
              : '0',
          },
          recipientsWithOhsStandardFeiGoals: {
            filterApplicable: !feiContainsFiltersThatAreNotAllowed,
            pct: feiOverviewData.data.length > 0 && feiOverviewData.data[0]['% recipients with fei']
              ? feiOverviewData.data[0]['% recipients with fei']
              : '0',
          },
          recipientsWithOhsStandardClass: {
            filterApplicable: !classContainsFiltersThatAreNotAllowed,
            pct: classOverviewData.data && classOverviewData.data.length > 0
                  && classOverviewData.data[0]['% recipients with class']
              ? classOverviewData.data[0]['% recipients with class']
              : '0',
          },
        };

        const showDashboardFiltersNotApplicable = containsFiltersThatAreNotApplicable('qa-dashboard', filters);

        const deliveryMethodData = dashboardData.find((item) => item.data_set === 'delivery_method_graph');
        const roleGraphData = dashboardData.find((item) => item.data_set === 'role_graph');
        const activityWidgetData = dashboardData.find((item) => item.data_set === 'activity_widget');
        const filteredReports = activityWidgetData.data.length
          ? activityWidgetData.data[0].filtered_reports : 0;

        const deliveryMethod = {
          filteredReports,
          records: deliveryMethodData.data,
          totalInPerson: 0,
          averageInPersonPercentage: 0,
          totalVirtualCount: 0,
          averageVirtualPercentage: 0,
          totalHybridCount: 0,
          averageHybridPercentage: 0,
          showDashboardFiltersNotApplicable,
        };

        const roleGraph = {
          showDashboardFiltersNotApplicable,
          filteredReports,
          records: roleGraphData.data
            ? roleGraphData.data.sort((a, b) => a.role_name.localeCompare(b.role_name))
            : [],
        };

        // Set data.
        setQaData({
          overviewData,
          rootCauseFeiGoalsGraph,
          deliveryMethod,
          roleGraph,
        });
        updateError('');
      } catch (e) {
        updateError('Unable to fetch QA data');
      } finally {
        setIsLoading(false);
      }
    }
    // Call resources fetch.
    fetchQaData();
  }, [filters]);

  return (
    <>
      <Helmet>
        <title>Quality Assurance Dashboard</title>
      </Helmet>
      <div className="ttahub-qa-dashboard">
        <h1 className="landing margin-top-0 margin-bottom-3">
          Quality assurance dashboard
        </h1>
        {error && (
        <Alert className="margin-bottom-2" type="error" role="alert">
          {error}
        </Alert>
        )}
        <Loader loading={isLoading} loadingLabel="Loading" />
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
            <ContentFromFeedByTag tagName="ttahub-qa-dash-filters" />
          </Drawer>
        </div>
        <QAOverview
          data={qaData.overviewData}
          loading={false}
        />
        <div>
          <Grid row>
            <DeliveryMethod
              data={qaData.deliveryMethod}
            />
          </Grid>
          <Grid row gap={2}>
            <Grid desktop={{ col: 6 }} mobile={{ col: 12 }}>
              <PercentageActivityReportByRole
                data={qaData.roleGraph}
              />
            </Grid>
            <Grid desktop={{ col: 6 }} mobile={{ col: 12 }}>
              <RootCauseFeiGoals
                data={qaData.rootCauseFeiGoalsGraph}
              />
            </Grid>
          </Grid>
          <Grid row>
            <Grid desktop={{ col: 12 }} mobile={{ col: 12 }}>
              <ApprovalRateByDeadline filters={regionFilters} />
            </Grid>
          </Grid>
        </div>
      </div>
    </>
  );
}
