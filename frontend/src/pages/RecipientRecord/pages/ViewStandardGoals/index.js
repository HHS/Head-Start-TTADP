import React, {
  useEffect,
  useState,
  useContext,
} from 'react';
import { DECIMAL_BASE } from '@ttahub/common';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Link, useLocation } from 'react-router-dom';
import {
  Alert, SummaryBox, SummaryBoxContent, SummaryBoxHeading,
} from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import moment from 'moment';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import Container from '../../../../components/Container';
import colors from '../../../../colors';
import AppLoadingContext from '../../../../AppLoadingContext';
import UserContext from '../../../../UserContext';
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

export default function ViewGoalDetails({
  recipient,
  regionId,
}) {
  const [fetchError, setFetchError] = useState('');
  const [goalHistory, setGoalHistory] = useState([]);
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
          setGoalHistory(data);
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

  const sortedGoalHistory = [...goalHistory].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  const firstGoal = sortedGoalHistory[0] || {};
  const goalTemplate = firstGoal.goalTemplate || {};
  const goalTemplateName = goalTemplate.templateName || 'Standard Goal';

  // Create accordion items from goal history
  const accordionItems = sortedGoalHistory.map((goal, index) => {
    // doing this moment/format transform here in order to make grouping by below
    // a bit more readable
    const statusUpdates = (goal.statusChanges && goal.statusChanges.length > 0
      ? goal.statusChanges.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
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

    const getUserByFromStatus = (update) => userDisplayFromStatus(goal, update);
    return {
      id: `goal-${goal.id}`,
      title: `G-${goal.id} | ${goal.status}`,
      expanded: index === 0,
      handleToggle: () => { }, // Add dummy handler to satisfy prop-types
      className: 'view-standard-goals-accordion',
      content: (
        <div className="goal-history-content">
          <SummaryBox>
            <SummaryBoxHeading headingLevel="h3">Goal updates</SummaryBoxHeading>
            <SummaryBoxContent>
              {' '}
              {statusUpdates.length > 0 ? (
                <ul className="usa-list" aria-label="Goal status updates">
                  {displayUpdates.map((update, updateIndex) => (
                    <li key={update.id}>
                      <strong>
                        <StatusActionTag
                          update={update}
                          goalHistory={sortedGoalHistory}
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

          {goal.responses && goal.responses.length > 0 && (
          <ReadOnlyField label="Root causes">
            {goal.responses.map((response) => (
              <div key={response.id}>
                {Array.isArray(response.response) ? (
                  response.response.join(', ')
                ) : (
                  <p>{response.response}</p>
                )}
              </div>
            ))}
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
                <h3 className="smart-hub-serif">Objective summary</h3>
                <ReadOnlyField label="TTA objective">
                  {objective.title}
                </ReadOnlyField>

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
                      {/* Display Courses if present */}
                      {(objective.activityReportObjectives || [])
                        .flatMap((aro) => aro.activityReportObjectiveCourses || [])
                        .filter(
                          (courseObj, i, self) => courseObj.course && i === self.findIndex(
                            (c) => c.course && c.course.id === courseObj.course.id,
                          ),
                        ).length > 0 && (
                          <ul className="usa-list margin-top-0 margin-bottom-0 resource-link-wrapper">
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

                      {/* Display Resources */}
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
                                        <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                          {resource.title || resource.url}
                                        </a>
                                      </li>
                                    ))}
                                </ul>
                        )}

                      {/* Display Objective Files */}
                      {!objective.activityReportObjectives
                              || !objective.activityReportObjectives.some(
                                (aro) => aro.files && aro.files.length > 0,
                              ) ? null : (
                                <ul className="usa-list margin-top-0 resource-link-wrapper">
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

      <h1 className="page-heading margin-top-0 margin-bottom-0 margin-left-2">
        TTA Goals for
        {' '}
        {recipient.name}
        {' '}
        - Region
        {' '}
        {regionId}
      </h1>

      <Container className="margin-y-3 margin-left-2 width-tablet" paddingX={4} paddingY={5}>
        <div className="margin-bottom-5">
          <h2 className="margin-top-0 margin-bottom-3 smart-hub-serif">Goal Summary</h2>
          <ReadOnlyField label="Recipient grant numbers">
            {firstGoal.grant && firstGoal.grant.number ? firstGoal.grant.number : 'N/A'}
          </ReadOnlyField>
          <ReadOnlyField label="Recipient's goal">
            {firstGoal.name || goalTemplateName}
          </ReadOnlyField>
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
