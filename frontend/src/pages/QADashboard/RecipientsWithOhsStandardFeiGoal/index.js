import React, {
  useState,
  useRef,
  useContext,
} from 'react';
import { Link } from 'react-router-dom';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid, Alert } from '@trussworks/react-uswds';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import colors from '../../../colors';
import RecipientsWithOhsStandardFeiGoalWidget from '../../../widgets/RecipientsWithOhsStandardFeiGoalWidget';
import Drawer from '../../../components/Drawer';
import ContentFromFeedByTag from '../../../components/ContentFromFeedByTag';
import DrawerTriggerButton from '../../../components/DrawerTriggerButton';
import FilterPanel from '../../../components/filter/FilterPanel';
import FilterPanelContainer from '../../../components/filter/FilterPanelContainer';
import useFilters from '../../../hooks/useFilters';
import { QA_DASHBOARD_FILTER_KEY, QA_DASHBOARD_FILTER_CONFIG } from '../constants';
import UserContext from '../../../UserContext';
import { getSelfServiceData } from '../../../fetchers/ssdi';
import { formatDateValue } from '../../../lib/dates';

const ALLOWED_SUBFILTERS = [
  'region',
  'createDate',
  'grantNumber',
  'recipient',
  'stateCode',
];

export const mapGoalStatusKey = (status) => {
  const statusMap = {
    [GOAL_STATUS.NOT_STARTED]: 4,
    [GOAL_STATUS.IN_PROGRESS]: 3,
    [GOAL_STATUS.SUSPENDED]: 2,
    [GOAL_STATUS.CLOSED]: 1,
  };
  return statusMap[status] || 0;
};

export default function RecipientsWithOhsStandardFeiGoal() {
  const pageDrawerRef = useRef(null);
  const [error, updateError] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const [recipientsWithOhsStandardFeiGoal, setRecipientsWithOhsStandardFeiGoal] = useState([]);

  const { user } = useContext(UserContext);

  const {
    // from useUserDefaultRegionFilters
    regions,

    // filter functionality
    filters,
    onApplyFilters,
    onRemoveFilter,
    filterConfig,
  } = useFilters(
    user,
    QA_DASHBOARD_FILTER_KEY,
    true,
    [],
    QA_DASHBOARD_FILTER_CONFIG,
  );

  useDeepCompareEffect(() => {
    async function fetchQaData() {
      setIsLoading(true);
      // Filters passed also contains region.
      try {
        const data = await getSelfServiceData(
          'recipients-with-ohs-standard-fei-goal',
          filters,
          ['with_fei_widget', 'with_fei_page'],
        );

        // Get summary and row data.
        const pageData = data.filter((d) => d.data_set === 'with_fei_page');
        const widgetData = data.filter((d) => d.data_set === 'with_fei_widget');
        // Convert data to format that widget expects.
        let formattedRecipientPageData = pageData[0].data.map((item) => {
          const { recipientId } = item;
          const regionId = item['region id'];
          const { recipientName } = item;
          const { goalId } = item;
          const { goalStatus } = item;
          // const { grantNumber } = item;
          const { createdAt } = item;
          const { rootCause } = item;
          const { grantNumber } = item;

          return {
            id: `${recipientId}-${goalId}`,
            heading: recipientName,
            name: recipientName,
            isUrl: true,
            isInternalLink: true,
            hideLinkIcon: true,
            sortKey: mapGoalStatusKey(goalStatus),
            link: `/recipient-tta-records/${recipientId}/region/${regionId}/profile`,
            data: [
              {
                title: 'Grant_number',
                value: grantNumber,
              },
              {
                title: 'Goal_created_on',
                value: formatDateValue(createdAt, 'MM/DD/YYYY'),
              },
              {
                title: 'Goal_number',
                value: `G-${goalId}`,
                isUrl: true,
                isInternalLink: true,
                link: `/recipient-tta-records/${recipientId}/region/${regionId}/goals?id[]=${goalId}`,
                hideLinkIcon: true,
              },
              {
                title: 'Goal_status',
                value: goalStatus,
              },
              {
                title: 'Root_cause',
                value: rootCause && rootCause.length ? rootCause.join(', ') : '', // Convert array to string.
              },
            ],
          };
        });

        // Sort formattedRecipientPageData SortKey desc.
        formattedRecipientPageData = formattedRecipientPageData.sort(
          (a, b) => b.sortKey - a.sortKey,
        );

        // Add headers.
        formattedRecipientPageData = {
          headers: ['Grant number', 'Goal created on', 'Goal number', 'Goal status', 'Root cause'],
          RecipientsWithOhsStandardFeiGoal: [...formattedRecipientPageData],
        };

        setRecipientsWithOhsStandardFeiGoal({
          pageData: formattedRecipientPageData,
          widgetData: widgetData[0].data[0],
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
    <div className="ttahub-recipients-with-ohs-standard-fei-goal">
      <Helmet>
        <title>Recipients with OHS standard FEI goal</title>
      </Helmet>
      <FontAwesomeIcon className="margin-right-1" data-testid="back-link-icon" color={colors.ttahubMediumBlue} icon={faArrowLeft} />
      <Link className="ttahub-recipient-record--tabs_back-to-search margin-bottom-2 display-inline-block" to="/dashboards/qa-dashboard">
        Back to Quality Assurance Dashboard
      </Link>
      <h1 className="landing margin-top-0">
        Recipients with OHS standard FEI goal
      </h1>
      <Grid row>
        {error && (
          <Alert className="margin-bottom-2" type="error" role="alert">
            {error}
          </Alert>
        )}
      </Grid>
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
      <DrawerTriggerButton customClass="margin-bottom-3" drawerTriggerRef={pageDrawerRef}>
        Learn how filters impact the data displayed
      </DrawerTriggerButton>
      <Drawer
        triggerRef={pageDrawerRef}
        stickyHeader
        stickyFooter
        title="QA dashboard filters"
      >
        <ContentFromFeedByTag tagName="ttahub-qa-dash-fei-filters" />
      </Drawer>
      <RecipientsWithOhsStandardFeiGoalWidget
        data={recipientsWithOhsStandardFeiGoal}
        loading={isLoading}
      />
    </div>
  );
}

RecipientsWithOhsStandardFeiGoal.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.arrayOf(PropTypes.string),
    homeRegionId: PropTypes.number,
    permissions: PropTypes.arrayOf(PropTypes.shape({
      userId: PropTypes.number,
      scopeId: PropTypes.number,
      regionId: PropTypes.number,
    })),
  }),
};

RecipientsWithOhsStandardFeiGoal.defaultProps = {
  user: null,
};
