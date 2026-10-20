import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert, Grid } from '@trussworks/react-uswds';
import moment from 'moment';
import PropTypes from 'prop-types';
import React, { useContext, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import useDeepCompareEffect from 'use-deep-compare-effect';
import colors from '../../../colors';
import ContentFromFeedByTag from '../../../components/ContentFromFeedByTag';
import Drawer from '../../../components/Drawer';
import DrawerTriggerButton from '../../../components/DrawerTriggerButton';
import FilterPanel from '../../../components/filter/FilterPanel';
import FilterPanelContainer from '../../../components/filter/FilterPanelContainer';
import { getSelfServiceData } from '../../../fetchers/ssdi';
import useFilters from '../../../hooks/useFilters';
import UserContext from '../../../UserContext';
import RecipientsWithClassScoresAndGoalsWidget from '../../../widgets/RecipientsWithClassScoresAndGoalsWidget';
import { QA_DASHBOARD_FILTER_CONFIG, QA_DASHBOARD_FILTER_KEY } from '../constants';

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
  const [recipientsWithClassScoresAndGoalsData, setRecipientsWithClassScoresAndGoalsData] =
    useState({});
  const { user } = useContext(UserContext);
  const {
    // from useUserDefaultRegionFilters
    regions,

    // filter functionality
    filters,
    onApplyFilters,
    onRemoveFilter,
    filterConfig,
  } = useFilters(user, QA_DASHBOARD_FILTER_KEY, true, [], QA_DASHBOARD_FILTER_CONFIG);

  /* istanbul ignore next: hard to test */
  useDeepCompareEffect(() => {
    async function fetchQaData() {
      setIsLoading(true);
      // Filters passed also contains region.
      try {
        const data = await getSelfServiceData('recipients-with-class-scores-and-goals', filters, [
          'with_class_widget',
          'with_class_page',
        ]);

        // Get summary and row data.
        const pageData = data.filter((d) => d.data_set === 'with_class_page');
        const widgetData = data.filter((d) => d.data_set === 'with_class_widget');

        // Convert data to the format the widget expects.
        const reducedRecipientData = pageData[0].data.reduce((acc, item) => {
          const {
            classReviewCardId,
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
          const formattedLastARStartDate =
            lastARStartDate === null ? null : moment(lastARStartDate).format('MM/DD/YYYY');
          const formattedReportDeliveryDate =
            reportDeliveryDate === null
              ? null
              : moment(reportDeliveryDate, 'YYYY-MM-DD').format('MM/DD/YYYY');

          // Check if the CLASS review card is already in the accumulator.
          const existingRecipient = acc.find((recipient) => recipient.id === classReviewCardId);
          if (existingRecipient) {
            // Add goal info.
            existingRecipient.goals.push({
              id: goalId,
              goalNumber: `G-${goalId}`,
              status: goalStatus,
              creator,
              collaborator: collaborators,
              goalCreatedAt,
              lastARStartDate: formattedLastARStartDate,
            });
            if (
              formattedLastARStartDate &&
              (!existingRecipient.lastARStartDate ||
                moment(formattedLastARStartDate, 'MM/DD/YYYY').isAfter(
                  moment(existingRecipient.lastARStartDate, 'MM/DD/YYYY')
                ))
            ) {
              existingRecipient.lastARStartDate = formattedLastARStartDate;
              const exportLastARStartDate = existingRecipient.dataForExport.find(
                ({ title }) => title === 'Last AR Start Date'
              );
              if (exportLastARStartDate) {
                exportLastARStartDate.value = formattedLastARStartDate;
              }
            }
            return acc;
          }

          // Else add a new recipient.
          const newRecipient = {
            id: classReviewCardId,
            recipientId,
            name: recipientName,
            heading: recipientName,
            emotionalSupport,
            classroomOrganization,
            instructionalSupport,
            grantNumber,
            lastARStartDate: formattedLastARStartDate,
            reportDeliveryDate: formattedReportDeliveryDate,
            regionId,
            dataForExport: [
              {
                title: 'Grant Number',
                value: grantNumber,
              },
              {
                title: 'Report Received Date',
                value: formattedReportDeliveryDate,
              },
              {
                title: 'Last AR Start Date',
                value: formattedLastARStartDate,
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
            ],
            goals: [
              {
                id: goalId,
                goalNumber: `G-${goalId}`,
                status: goalStatus,
                creator,
                collaborator: collaborators,
                goalCreatedAt,
                lastARStartDate: formattedLastARStartDate,
              },
            ],
          };

          return [...acc, newRecipient];
        }, []);

        // Sort by name for initial display.
        const sortedReducedRecipients = reducedRecipientData.sort((a, b) =>
          a.name.localeCompare(b.name)
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
      <FontAwesomeIcon
        className="margin-right-1"
        data-testid="back-link-icon"
        color={colors.ttahubMediumBlue}
        icon={faArrowLeft}
      />
      <Link
        className="ttahub-recipient-record--tabs_back-to-search margin-bottom-2 display-inline-block"
        to="/dashboards/qa-dashboard"
      >
        Back to Quality Assurance Dashboard
      </Link>
      <h1 className="landing margin-top-0">Recipients with CLASS&reg; scores and goals</h1>
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
      <Drawer triggerRef={pageDrawerRef} stickyHeader stickyFooter title="QA dashboard filters">
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
    permissions: PropTypes.arrayOf(
      PropTypes.shape({
        userId: PropTypes.number,
        scopeId: PropTypes.number,
        regionId: PropTypes.number,
      })
    ),
  }),
};

RecipientsWithClassScoresAndGoals.defaultProps = {
  user: null,
};
