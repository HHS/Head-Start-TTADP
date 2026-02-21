import React, {
  useContext,
  useState,
  useRef,
} from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid, Alert } from '@trussworks/react-uswds';
import colors from '../../../colors';
import RecipientsWithNoTtaWidget from '../../../widgets/RecipientsWithNoTtaWidget';
import FilterPanel from '../../../components/filter/FilterPanel';
import FilterPanelContainer from '../../../components/filter/FilterPanelContainer';
import useFilters from '../../../hooks/useFilters';
import Drawer from '../../../components/Drawer';
import ContentFromFeedByTag from '../../../components/ContentFromFeedByTag';
import DrawerTriggerButton from '../../../components/DrawerTriggerButton';
import UserContext from '../../../UserContext';
import { QA_DASHBOARD_FILTER_KEY, QA_DASHBOARD_FILTER_CONFIG } from '../constants';
import { getSelfServiceData } from '../../../fetchers/ssdi';
import { formatDateValue } from '../../../lib/dates';

const ALLOWED_SUBFILTERS = [
  'region',
  'startDate',
  'endDate',
  'grantNumber',
  'recipient',
  'stateCode',
];
export default function RecipientsWithNoTta() {
  const pageDrawerRef = useRef(null);
  const [error, updateError] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const [recipientsWithNoTTA, setRecipientsWithNoTTA] = useState([]);
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
          'recipients-with-no-tta',
          filters,
          ['no_tta_widget', 'no_tta_page'],
        );

        // Get summary and row data.
        const pageData = data.filter((d) => d.data_set === 'no_tta_page');
        const widgetData = data.filter((d) => d.data_set === 'no_tta_widget');

        // Format the recipient data for the generic widget.
        let formattedRecipientPageData = pageData[0].data.map((item) => {
          const recipientId = item['recipient id'];
          const regionId = item['region id'];
          const recipientName = item['recipient name'];
          const dateOfLastTta = item['last tta'];
          const daysSinceLastTta = item['days since last tta'];

          const formattedDate = dateOfLastTta
            ? formatDateValue(dateOfLastTta, 'MM/DD/YYYY')
            : null;

          const numericDaysSinceLastTta = Number(daysSinceLastTta);
          const safeDaysSinceLastTta = Number.isFinite(numericDaysSinceLastTta)
            && numericDaysSinceLastTta >= 0
            ? numericDaysSinceLastTta
            : null;

          return {
            id: recipientId,
            heading: recipientName,
            name: recipientName,
            isUrl: true,
            isInternalLink: true,
            hideLinkIcon: true,
            link: `/recipient-tta-records/${recipientId}/region/${regionId}/profile`,
            data: [
              {
                title: 'Date_of_Last_TTA',
                value: formattedDate === 'Invalid date' ? null : formattedDate,
              },
              {
                title: 'Days_Since_Last_TTA',
                value: safeDaysSinceLastTta,
              },
            ],
          };
        });

        // Sort formattedRecipientPageData by Days Since Last TTA desc.
        formattedRecipientPageData.sort((a, b) => b.data[1].value - a.data[1].value);

        // Add headers.
        formattedRecipientPageData = {
          headers: ['Date of Last TTA', 'Days Since Last TTA'],
          RecipientsWithNoTta: [...formattedRecipientPageData],
        };

        setRecipientsWithNoTTA({
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
    <div className="ttahub-recipients-with-no-tta">
      <Helmet>
        <title>Recipients with no TTA</title>
      </Helmet>
      <FontAwesomeIcon className="margin-right-1" data-testid="back-link-icon" color={colors.ttahubMediumBlue} icon={faArrowLeft} />
      <Link className="ttahub-recipient-record--tabs_back-to-search margin-bottom-2 display-inline-block" to="/dashboards/qa-dashboard">
        Back to Quality Assurance Dashboard
      </Link>
      <h1 className="landing margin-top-0">
        Recipients with no TTA
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
        <ContentFromFeedByTag tagName="ttahub-qa-dash-recipients-no-tta-filter" />
      </Drawer>
      <RecipientsWithNoTtaWidget
        data={recipientsWithNoTTA}
        loading={isLoading}
      />
    </div>
  );
}

RecipientsWithNoTta.propTypes = {
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

RecipientsWithNoTta.defaultProps = {
  user: null,
};
