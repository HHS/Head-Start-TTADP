import React, {
  useEffect,
  useState,
  useContext,
} from 'react';
import { DECIMAL_BASE } from '@ttahub/common';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link, useLocation } from 'react-router-dom';
import {
  Alert, SummaryBox, SummaryBoxContent, SummaryBoxHeading,
} from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import moment from 'moment';
import {
  faArrowLeft,
  faChartColumn,
  faCheckCircle,
  faPenCircle,
  faPauseCircle,
} from '../../../../icons';
import { DashboardOverviewContainer } from '../../../../widgets/DashboardOverviewContainer';
import Container from '../../../../components/Container';
import colors from '../../../../colors';
import AppLoadingContext from '../../../../AppLoadingContext';
import UserContext from '../../../../UserContext';
import ContextMenu from '../../../../components/ContextMenu';
import ReadOnlyField from '../../../../components/ReadOnlyField';
import { Accordion } from '../../../../components/Accordion';
import { DATE_DISPLAY_FORMAT } from '../../../../Constants';
import './index.scss';

export const GoalUserIdentifier = ({ goal }) => {
  if (goal.standard === 'Monitoring') {
    return ' by OHS';
  }

  return goal.goalCollaborators && goal.goalCollaborators.some(
    (c) => c.collaboratorType && c.collaboratorType.name === 'Creator' && c.user,
  )
    ? ` by ${goal.goalCollaborators.find(
      (c) => c.collaboratorType && c.collaboratorType.name === 'Creator',
    ).user.name}`
    : '';
};

export const StatusActionTag = ({
  update, goalHistory, currentGoalIndex,
}) => {
  const isReopened = (update.reason === 'Goal created' || update.reason === 'Active monitoring citations')
    && goalHistory.some((hist, index) => index > currentGoalIndex && hist.status === 'Closed');

  if (update.reason === 'Goal created' || update.reason === 'Active monitoring citations') {
    return <span>{isReopened ? 'Reopened on' : 'Added on'}</span>;
  }

  switch (update.newStatus) {
    case GOAL_STATUS.NOT_STARTED:
      return <span>Added on</span>;
    case GOAL_STATUS.IN_PROGRESS:
      return <span>Started on</span>;
    case GOAL_STATUS.SUSPENDED:
      return <span>Suspended on</span>;
    case GOAL_STATUS.CLOSED:
      return <span>Closed on</span>;
    case 'Complete':
      return <span>Completed on</span>;
    default:
      return (
        <span>
          {update.newStatus}
          {' '}
          on
        </span>
      );
  }
};

StatusActionTag.propTypes = {
  update: PropTypes.shape({
    newStatus: PropTypes.string,
    reason: PropTypes.string,
  }).isRequired,
  goalHistory: PropTypes.arrayOf(PropTypes.shape({
    status: PropTypes.string,
  })).isRequired,
  currentGoalIndex: PropTypes.number.isRequired,
};

export const userDisplayFromStatus = (goal, update) => {
  if (update && update.synthetic) {
    return <GoalUserIdentifier goal={goal} />;
  }

  if (goal.standard === 'Monitoring'
    && update.newStatus === GOAL_STATUS.NOT_STARTED
    && update.reason === 'Active monitoring citations') {
    return ' by OHS';
  }

  if (goal.standard === 'Monitoring'
    && update.newStatus === 'Closed'
    && update.reason === 'No active monitoring citations') {
    return ' by OHS';
  }

  if (update.user) {
    return ` by ${update.user.name}, ${update.user.roles.map(({ name }) => name).join(', ')}`;
  }
  return '';
};

export const formatRecipientGrantDisplay = (
  grant,
  defaultRecipientName = '',
  recipientGrants = [],
  goalGrantId = null,
) => {
  if (!grant) {
    return 'N/A';
  }

  const recipientName = grant.recipient?.name || grant.recipientName || defaultRecipientName;
  let grantNumberWithProgramTypes = grant.numberWithProgramTypes;

  if (!grantNumberWithProgramTypes && goalGrantId && Array.isArray(recipientGrants)) {
    const matchingRecipientGrant = recipientGrants.find((g) => g.id === goalGrantId);
    grantNumberWithProgramTypes = matchingRecipientGrant?.numberWithProgramTypes;
  }

  if (grantNumberWithProgramTypes && recipientName) {
    return `${recipientName} - ${grantNumberWithProgramTypes}`;
  }

  if (grantNumberWithProgramTypes) {
    return grantNumberWithProgramTypes;
  }

  if (grant.number && recipientName) {
    return `${recipientName} - ${grant.number}`;
  }

  if (grant.number) {
    return grant.number;
  }

  return 'N/A';
};

export default function ViewGoalDetails({
  recipient,
  regionId,
}) {
  const [fetchError, setFetchError] = useState('');
  const [goalHistory, setGoalHistory] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const { setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext);
  const { user } = useContext(UserContext);
  const location = useLocation();

  const getQueryParams = () => {
    const searchParams = new URLSearchParams(location.search);
    const goalId = searchParams.get('goalId');
    return { goalId };
  };

  const { goalId } = getQueryParams();

  const menuItems = [{
    label: 'Print goal summary',
    onClick: () => window.print(),
  }];

  const canView = user.permissions.filter(
    (permission) => permission.regionId === parseInt(regionId, DECIMAL_BASE),
  ).length > 0;

  useEffect(() => {
    let isSubscribed = true; // Flag to track component mount status

    async function fetchGoalHistory() {
      try {
        setAppLoadingText('Loading goal history');
        setIsAppLoading(true);

        const response = await fetch(`/api/goals/${goalId}/history`);

        if (!response.ok) {
          throw new Error(`Error fetching goal history: ${response.status}`);
        }

        const data = await response.json();
        if (isSubscribed) {
          setGoalHistory(data.goals);
          setOverview(data.overview);
        }
      } catch (err) {
        if (isSubscribed) {
          setFetchError('There was an error fetching goal history');
        }
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        if (isSubscribed) {
          setIsAppLoading(false);
          setLoading(false);
        }
      }
    }

    if (goalId) {
      fetchGoalHistory();
    } else {
      // No goalId provided
      setFetchError('Missing required parameters');
      setLoading(false);
    }

    // Cleanup function
    return () => {
      isSubscribed = false;
    };
  }, [goalId, setAppLoadingText, setIsAppLoading]);

  if (!canView) {
    return (
      <Alert role="alert" className="margin-y-2" type="error">
        You don&apos;t have permission to view this page
      </Alert>
    );
  }

  if (fetchError) {
    return (
      <Alert role="alert" className="margin-y-2" type="error">
        {fetchError}
      </Alert>
    );
  }

  if (loading) {
    return null;
  }

  if (goalHistory.length === 0) {
    return (
      <Alert role="alert" className="margin-y-2" type="info">
        No goal history found
      </Alert>
    );
  }

  const firstGoal = goalHistory[0] || {};
  const goalTemplate = firstGoal.goalTemplate || {};
  const goalTemplateName = goalTemplate.templateName || 'Standard Goal';

  // Create accordion items from goal history
  const accordionItems = goalHistory.map((goal, index) => {
    // doing this moment/format transform here in order to make grouping by below
    // a bit more readable
    const statusUpdates = (goal.statusChanges && goal.statusChanges.length > 0
      ? goal.statusChanges
      : []).map((gsc) => ({
      ...gsc,
      performedAt: moment.utc(
        gsc.performedAt || gsc.createdAt,
      ).format(DATE_DISPLAY_FORMAT),
    }));
    // Deduplicate near-identical updates (same time and statuses) to avoid double-rendering.
    const dedupedStatusUpdates = statusUpdates.reduce((acc, curr) => {
      if (!acc.find((gsc) => gsc.performedAt === curr.performedAt
        && gsc.newStatus === curr.newStatus
        && gsc.oldStatus === curr.oldStatus)) {
        acc.push(curr);
      }
      return acc;
    }, []);

    // Ensure the list includes an initial "Added" item when there are updates
    // but no explicit add. Criteria to detect an existing "Added"-like update:
    // oldStatus is null or newStatus is Not Started.
    const hasAddedUpdate = dedupedStatusUpdates.some((u) => u.oldStatus === null
      || u.newStatus === GOAL_STATUS.NOT_STARTED);
    const displayUpdates = [...dedupedStatusUpdates];
    if (dedupedStatusUpdates.length > 0 && !hasAddedUpdate) {
      displayUpdates.unshift({
        id: `synthetic-added-${goal.id}-${index}`,
        performedAt: moment.utc(goal.createdAt).format(DATE_DISPLAY_FORMAT),
        createdAt: goal.createdAt,
        newStatus: GOAL_STATUS.NOT_STARTED,
        oldStatus: null,
        // mark as synthetic so we can tailor rendering (e.g., user identifier)
        synthetic: true,
      });
    }

    const objectives = goal.objectives || [];
    const rootCauseItems = (goal.responses || []).reduce((items, response) => {
      if (Array.isArray(response.response)) {
        response.response
          .filter(Boolean)
          .forEach((value, valueIndex) => {
            items.push({
              key: `${response.id}-${valueIndex}`,
              text: value,
            });
          });
        return items;
      }

      if (response.response) {
        items.push({
          key: `${response.id}`,
          text: response.response,
        });
      }

      return items;
    }, []);

    const getUserByFromStatus = (update) => userDisplayFromStatus(goal, update);
    return {
      id: `goal-${goal.id}`,
      title: `G-${goal.id} | ${goal.status}`,
      expanded: index === 0,
      handleToggle: () => { }, // Add dummy handler to satisfy prop-types
      className: `view-standard-goals-accordion${index > 0 ? ' view-standard-goals-accordion--with-divider' : ''}`,
      content: (
        <div className="goal-history-content">
          <div className="print-only margin-bottom-2">
            <h2 className="margin-top-0 margin-bottom-0 smart-hub-serif goal-history-print-goal-number">Goal number</h2>
            <p className="margin-top-1 margin-bottom-2">{`G-${goal.id}`}</p>
          </div>
          <SummaryBox>
            <SummaryBoxHeading headingLevel="h4">Goal updates</SummaryBoxHeading>
            <SummaryBoxContent>
              {' '}
              {statusUpdates.length > 0 ? (
                <ul className="usa-list" aria-label="Goal status updates">
                  {displayUpdates.map((update, updateIndex) => (
                    <li key={update.id}>
                      <strong>
                        <StatusActionTag
                          update={update}
                          goalHistory={goalHistory}
                          currentGoalIndex={index}
                        />
                      </strong>
                      {' '}
                      <strong>
                        {update.performedAt}
                      </strong>
                      {getUserByFromStatus(update)}
                      {(update.newStatus === GOAL_STATUS.SUSPENDED
                        && updateIndex !== displayUpdates.length - 1) ? (
                          <>
                            <br />
                            Reason:
                            {' '}
                            {update.reason}
                          </>
                        ) : <></>}
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="usa-list" aria-label="Goal status updates">
                  <li>
                    <strong>
                      {goal.status === GOAL_STATUS.NOT_STARTED ? 'Added' : `${goal.status}`}
                    </strong>
                    {' '}
                    on
                    {' '}
                    <strong>{moment.utc(goal.createdAt).format(DATE_DISPLAY_FORMAT)}</strong>
                    <GoalUserIdentifier goal={goal} />
                  </li>
                </ul>
              )}
            </SummaryBoxContent>
          </SummaryBox>

          {rootCauseItems.length > 0 && (
          <ReadOnlyField label="Root causes">
            <ul className="usa-list margin-y-0" aria-label="Root causes list">
              {rootCauseItems.map((rootCause) => (
                <li key={rootCause.key}>{rootCause.text}</li>
              ))}
            </ul>
          </ReadOnlyField>
          )}

          <div className="goal-status-section margin-bottom-3">
            <ReadOnlyField label="Goal status">
              {goal.status}
              {goal.status === GOAL_STATUS.SUSPENDED
                ? (
                  <>
                    {' '}
                    -
                    {' '}
                    {goal.reason}
                  </>
                )
                : <></>}
            </ReadOnlyField>
          </div>

          {objectives.length > 0 && (
          <div className="objective-details-section margin-bottom-3">
            {objectives.map((objective) => (
              <div key={objective.id} className="margin-bottom-3">
                <h4 className="smart-hub-serif">Objective summary</h4>
                <ReadOnlyField label="TTA objective">
                  {objective.title}
                </ReadOnlyField>

                {objective.ttaSpecialists && objective.ttaSpecialists.length > 0 ? (
                  <div className="margin-top-2">
                    <ReadOnlyField label="TTA specialists">
                      {objective.ttaSpecialists.join('; ')}
                    </ReadOnlyField>
                  </div>
                ) : null}

                {/* Display Reports */}
                {objective.activityReportObjectives
                        && objective.activityReportObjectives.length > 0 && (
                          <div className="margin-top-2">
                            <ReadOnlyField label="Reports">
                              {objective.activityReportObjectives
                                .filter((aro) => aro.activityReport)
                                .map((aro, reportIndex, array) => (
                                  <React.Fragment key={`report-${aro.activityReport.id}`}>
                                    <Link to={`/activity-reports/view/${aro.activityReport.id}`}>
                                      {aro.activityReport.displayId}
                                    </Link>
                                    {reportIndex < array.length - 1 && ', '}
                                  </React.Fragment>
                                ))}
                            </ReadOnlyField>
                          </div>
                )}

                {/* Display Topics */}
                {!objective.activityReportObjectives
                        || !objective.activityReportObjectives.some(
                          (aro) => aro.topics && aro.topics.length > 0,
                        ) ? null : (
                          <div className="margin-top-2">
                            <ReadOnlyField label="Topics">
                              {(objective.activityReportObjectives || [])
                                .flatMap((aro) => aro.topics || [])
                                .filter(
                                  (topic, i, self) => i === self.findIndex(
                                    (t) => t.id === topic.id,
                                  ),
                                )
                                .map((topic, topicIndex, array) => (
                                  <React.Fragment key={`topic-${topic.id}`}>
                                    {topic.name}
                                    {topicIndex < array.length - 1 && ', '}
                                  </React.Fragment>
                                ))}
                            </ReadOnlyField>
                          </div>
                  )}
                {/* Check if there are any resources before rendering the section */}
                {(
                  // Check for courses
                  ((objective.activityReportObjectives || [])
                    .flatMap((aro) => aro.activityReportObjectiveCourses || [])
                    .filter(
                      (courseObj, i, self) => courseObj.course && i === self.findIndex(
                        (c) => c.course && c.course.id === courseObj.course.id,
                      ),
                    ).length > 0)
                  // Check for resources/links
                  || ((objective.activityReportObjectives || []).some(
                    (aro) => aro.resources && aro.resources.length > 0,
                  ))
                  // Check for files
                  || ((objective.activityReportObjectives || []).some(
                    (aro) => aro.files && aro.files.length > 0,
                  ))
                ) && (
                  <>
                    <p className="usa-prose margin-bottom-0 text-bold">Resources</p>
                    <div className="resource-sections-container">
                      {/* Courses are plain text in the Resources section (not links). */}
                      {(objective.activityReportObjectives || [])
                        .flatMap((aro) => aro.activityReportObjectiveCourses || [])
                        .filter(
                          (courseObj, i, self) => courseObj.course && i === self.findIndex(
                            (c) => c.course && c.course.id === courseObj.course.id,
                          ),
                        ).length > 0 && (
                          <ul className="usa-list margin-top-0 margin-bottom-0 resource-courses-wrapper">
                            {objective.activityReportObjectives
                              .flatMap((aro) => aro.activityReportObjectiveCourses || [])
                              .filter(
                                (courseObj, i, self) => courseObj.course && i === self.findIndex(
                                  (c) => c.course && c.course.id === courseObj.course.id,
                                ),
                              )
                              .map((courseObj) => (
                                <li key={`course-${courseObj.course.id}`}>
                                  {courseObj.course.name}
                                </li>
                              ))}
                          </ul>
                      )}

                      {!objective.activityReportObjectives
                              || !objective.activityReportObjectives.some(
                                (aro) => aro.resources && aro.resources.length > 0,
                              ) ? null : (
                                <ul className="usa-list margin-top-0 resource-link-wrapper">
                                  {(objective.activityReportObjectives || [])
                                    .flatMap((aro) => aro.resources || [])
                                    .filter(
                                      (resource, i, self) => i === self.findIndex(
                                        (r) => r.id === resource.id,
                                      ),
                                    )
                                    .map((resource) => (
                                      <li key={`resource-${resource.id}`}>
                                        <a
                                          className={!resource.title || resource.title === resource.url ? 'resource-url-link' : 'resource-title-link'}
                                          href={resource.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          {resource.title || resource.url}
                                        </a>
                                      </li>
                                    ))}
                                </ul>
                        )}

                      {/* Files are plain text entries so they are never underlined like links. */}
                      {!objective.activityReportObjectives
                              || !objective.activityReportObjectives.some(
                                (aro) => aro.files && aro.files.length > 0,
                              ) ? null : (
                                <ul className="usa-list margin-top-0 resource-files-wrapper">
                                  {(objective.activityReportObjectives || [])
                                    .flatMap((aro) => aro.files || [])
                                    .filter(
                                      (file, i, self) => i === self.findIndex(
                                        (f) => f.id === file.id,
                                      ),
                                    )
                                    .map((file) => (
                                      <li key={`file-${file.id}`}>
                                        {file.originalFileName}
                                      </li>
                                    ))}
                                </ul>
                        )}
                    </div>
                  </>
                )}

                {/* Display Objective Status */}
                <ReadOnlyField label="Objective status" className="margin-top-2">
                  {objective.status}
                </ReadOnlyField>
              </div>
            ))}
          </div>
          )}
        </div>
      ),
    };
  });

  return (
    <>
      <Link
        className="ttahub-recipient-record--tabs_back-to-search margin-left-2 margin-top-4 margin-bottom-3 display-inline-block"
        to={`/recipient-tta-records/${recipient.id}/region/${regionId}/rttapa/`}
      >
        <FontAwesomeIcon className="margin-right-1" color={colors.ttahubMediumBlue} icon={faArrowLeft} />
        <span>Back to RTTAPA</span>
      </Link>

      <h1 className="page-heading view-standard-goals-page-heading margin-top-0 margin-bottom-0 margin-left-2">
        TTA Goals for
        {' '}
        {recipient.name}
        {' '}
        - Region
        {' '}
        {regionId}
      </h1>

      <Container className="margin-y-3 margin-left-2 maxw-desktop view-standard-goals-print-container" paddingX={4} paddingY={5}>
        <div className="margin-bottom-3 goal-summary-block">
          <div className="display-flex flex-justify margin-bottom-3 goal-summary-heading-row">
            <h2 className="margin-top-0 margin-bottom-0 smart-hub-serif">Goal summary</h2>
            <div className="no-print">
              <ContextMenu
                label={`Actions for goal ${goalId}`}
                menuItems={menuItems}
              />
            </div>
          </div>
          <ReadOnlyField label="Recipient grant numbers">
            {formatRecipientGrantDisplay(
              firstGoal.grant,
              recipient.name,
              recipient.grants,
              firstGoal.grantId,
            )}
          </ReadOnlyField>
          <div className="recipient-goal-print-accent">
            <ReadOnlyField label="Recipient's goal">
              {firstGoal.name || goalTemplateName}
            </ReadOnlyField>
          </div>
        </div>

        <div className="goal-history-dashboard no-print">
          <DashboardOverviewContainer
            loading={loading}
            fieldData={[
              {
                key: 'activity-reports',
                icon: faChartColumn,
                iconColor: colors.success,
                backgroundColor: colors.successLighter,
                label1: 'Activity reports',
                data: String(overview?.activityReports ?? 0),
                showTooltip: true,
                tooltipText: 'The number of Activity Reports the goal was used on.',
              },
              {
                key: 'goal-objectives',
                icon: faPenCircle,
                iconColor: colors.ttahubMediumBlue,
                backgroundColor: colors.ttahubBlueLight,
                label1: 'Goal objectives',
                data: String(overview?.objectives ?? 0),
                showTooltip: true,
                tooltipText: 'The number of objectives on the goal.',
              },
              {
                key: 'goal-closures',
                icon: faCheckCircle,
                iconColor: colors.success,
                backgroundColor: colors.successLighter,
                label1: 'Goal closures',
                data: String(overview?.closures ?? 0),
                showTooltip: true,
                tooltipText: 'The number of times the goal has been closed.',
              },
              {
                key: 'goal-suspensions',
                icon: faPauseCircle,
                iconColor: colors.errorDark,
                backgroundColor: colors.errorLighter,
                label1: 'Goal suspensions',
                data: String(overview?.suspensions ?? 0),
                showTooltip: true,
                tooltipText: 'The number of times the goal has been suspended.',
              },
            ]}
          />
        </div>

        <div className="goal-history-print-overview print-only margin-bottom-4">
          <p className="margin-bottom-1 text-bold">Goal information:</p>
          <p className="margin-y-0">
            <strong>{overview?.activityReports ?? 0}</strong>
            {' '}
            Activity Reports
          </p>
          <p className="margin-y-0">
            <strong>{overview?.objectives ?? 0}</strong>
            {' '}
            goal objectives
          </p>
          <p className="margin-y-0">
            <strong>{overview?.closures ?? 0}</strong>
            {' '}
            goal closures
          </p>
          <p className="margin-y-0">
            <strong>{overview?.suspensions ?? 0}</strong>
            {' '}
            goal suspensions
          </p>
        </div>

        <Accordion
          multiselectable
          bordered
          items={accordionItems}
        />
      </Container>
    </>
  );
}

ViewGoalDetails.propTypes = {
  recipient: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    grants: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        numberWithProgramTypes: PropTypes.string,
      }),
    ),
  }).isRequired,
  regionId: PropTypes.string.isRequired,
};
