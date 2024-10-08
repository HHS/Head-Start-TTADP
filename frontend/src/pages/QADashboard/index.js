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
import { getSelfServiceData } from '../../fetchers/ssdi';

const DISALLOWED_FILTERS = [
  'domainClassroomOrganization',
  'domainEmotionalSupport',
  'domainInstructionalSupport',
];
const ALLOWED_SUBFILTERS = QA_DASHBOARD_FILTER_CONFIG.map(({ id }) => id)
  .filter((id) => !DISALLOWED_FILTERS.includes(id));

export default function QADashboard() {
  const { user } = useContext(UserContext);
  const drawerTriggerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, updateError] = useState();
  const [qaData, setQaData] = useState({});
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

  useDeepCompareEffect(() => {
    async function fetchQaDat() {
      setIsLoading(true);
      // Filters passed also contains region.
      try {
        const data = await getSelfServiceData(
          'qa-dashboard',
          filters,
        );
        setQaData(data);
        updateError('');
      } catch (e) {
        updateError('Unable to fetch QA data');
      } finally {
        setIsLoading(false);
      }
    }
    // Call resources fetch.
    fetchQaDat();
  }, [filters]);

  return (
    <>
      <Helmet>
        <title>Quality Assurance Dashboard</title>
      </Helmet>
      <div className="ttahub-dashboard">
        <h1 className="landing margin-top-0 margin-bottom-3">
          Quality assurance dashboard
        </h1>
        {error && (
        <Alert className="margin-bottom-2" type="error" role="alert">
          {error}
        </Alert>
        )}
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
          loading={isLoading}
        />

        <div>
          <Grid row>
            <DeliveryMethod
              data={qaData.deliveryMethod}
              loading={isLoading}
            />
          </Grid>
          <Grid row gap={2}>
            <Grid desktop={{ col: 6 }} mobile={{ col: 12 }}>
              <PercentageActivityReportByRole data={qaData.roleGraph} />
            </Grid>
            <Grid desktop={{ col: 6 }} mobile={{ col: 12 }}>
              <RootCauseFeiGoals
                data={qaData.rootCauseFeiGoalsGraph}
              />
            </Grid>
          </Grid>

        </div>
      </div>
    </>
  );
}
