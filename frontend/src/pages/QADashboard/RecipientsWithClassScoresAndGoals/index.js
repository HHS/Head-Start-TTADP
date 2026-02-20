import React, {
  useState,
  useRef,
  useContext,
} from 'react';
import { format, parseISO, parse } from 'date-fns';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Helmet } from 'react-helmet';
import {
  Grid, Alert,
} from '@trussworks/react-uswds';
import colors from '../../../colors';
import Drawer from '../../../components/Drawer';
import ContentFromFeedByTag from '../../../components/ContentFromFeedByTag';
import DrawerTriggerButton from '../../../components/DrawerTriggerButton';
import FilterPanel from '../../../components/filter/FilterPanel';
import FilterPanelContainer from '../../../components/filter/FilterPanelContainer';
import useFilters from '../../../hooks/useFilters';
import RecipientsWithClassScoresAndGoalsWidget from '../../../widgets/RecipientsWithClassScoresAndGoalsWidget';
import { QA_DASHBOARD_FILTER_KEY, QA_DASHBOARD_FILTER_CONFIG } from '../constants';
import UserContext from '../../../UserContext';
import { getSelfServiceData } from '../../../fetchers/ssdi';

const ALLOWED_SUBFILTERS = [
  'domainClassroomOrganization',
  'domainInstructionalSupport',
  'domainEmotionalSupport',
  'createDate',
  'group',
  'grantNumber',
  'recipient',
  'status',
  'region',
  'stateCode',
];
export default function RecipientsWithClassScoresAndGoals() {
  const pageDrawerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, updateError] = useState();
  const [recipientsWithClassScoresAndGoalsData,
    setRecipientsWithClassScoresAndGoalsData] = useState({});
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

  /* istanbul ignore next: hard to test */
  useDeepCompareEffect(() => {
    async function fetchQaData() {
      setIsLoading(true);
      // Filters passed also contains region.
      try {
        const data = await getSelfServiceData(
          'recipients-with-class-scores-and-goals',
          filters,
          ['with_class_widget', 'with_class_page'],
        );

        // Get summary and row data.
        const pageData = data.filter((d) => d.data_set === 'with_class_page');
        const widgetData = data.filter((d) => d.data_set === 'with_class_widget');

        // Convert data to the format the widget expects.
        const reducedRecipientData = pageData[0].data.reduce((acc, item) => {
          const {
            recipientId,
            recipientName,
            classroomOrganization,
            emotionalSupport,
            goalCreatedAt,
            goalId,
            goalStatus,
            grantNumber,
            instructionalSupport,
            lastARStartDate,
            reportDeliveryDate,
            collaborators,
            creator,
          } = item;

          const regionId = item['region id'];
          // Check if recipientId is already in the accumulator.
          const existingRecipient = acc.find((recipient) => recipient.id === recipientId);
          if (existingRecipient) {
            // Add goal info.
            existingRecipient.goals.push({
              id: goalId,
              goalNumber: `G-${goalId}`,
              status: goalStatus,
              creator,
              collaborator: collaborators,
              goalCreatedAt,
            });
            return acc;
          }

          // Else add a new recipient.
          const newRecipient = {
            id: recipientId,
            name: recipientName,
            heading: recipientName,
            emotionalSupport,
            classroomOrganization,
            instructionalSupport,
            grantNumber,
            lastARStartDate: lastARStartDate === null ? null : format(parseISO(lastARStartDate), 'MM/dd/yyyy'),
            reportDeliveryDate: reportDeliveryDate === null ? null : format(parse(reportDeliveryDate, 'yyyy-MM-dd', new Date()), 'MM/dd/yyyy'),
            regionId,
            dataForExport: [
              {
                title: 'Last AR Start Date',
                value: lastARStartDate === null ? null : format(parseISO(lastARStartDate), 'MM/dd/yyyy'),
              },
              {
                title: 'Emotional Support',
                value: emotionalSupport,
              },
              {
                title: 'Classroom Organization',
                value: classroomOrganization,
              },
              {
                title: 'Instructional Support',
                value: instructionalSupport,
              },
              {
                title: 'Report Delivery Date',
                value: reportDeliveryDate === null ? null : format(parse(reportDeliveryDate, 'yyyy-MM-dd', new Date()), 'MM/dd/yyyy'),
              },
            ],
            goals: [
              {
                id: goalId,
                goalNumber: `G-${goalId}`,
                status: goalStatus,
                creator,
                collaborator: collaborators,
                goalCreatedAt,
              },
            ],
          };

          return [...acc, newRecipient];
        }, []);

        // Sort by name for initial display.
        const sortedReducedRecipients = reducedRecipientData.sort(
          (a, b) => a.name.localeCompare(b.name),
        );

        setRecipientsWithClassScoresAndGoalsData({
          widgetData: widgetData[0].data[0],
          pageData: sortedReducedRecipients,
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
        <title>Recipients with CLASS&reg; scores and goals</title>
      </Helmet>
      <FontAwesomeIcon className="margin-right-1" data-testid="back-link-icon" color={colors.ttahubMediumBlue} icon={faArrowLeft} />
      <Link className="ttahub-recipient-record--tabs_back-to-search margin-bottom-2 display-inline-block" to="/dashboards/qa-dashboard">
        Back to Quality Assurance Dashboard
      </Link>
      <h1 className="landing margin-top-0">
        Recipients with CLASS&reg; scores and goals
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
        <ContentFromFeedByTag tagName="ttahub-qa-dash-class-filters" />
      </Drawer>
      <RecipientsWithClassScoresAndGoalsWidget
        data={recipientsWithClassScoresAndGoalsData}
        parentLoading={isLoading}
      />
    </div>
  );
}

RecipientsWithClassScoresAndGoals.propTypes = {
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

RecipientsWithClassScoresAndGoals.defaultProps = {
  user: null,
};
