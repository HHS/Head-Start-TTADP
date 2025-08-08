import React, {
  useEffect,
  useState,
  useContext,
} from 'react';
import { DECIMAL_BASE } from '@ttahub/common';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Link, useLocation } from 'react-router-dom';
import { Alert } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import moment from 'moment';
import Container from '../../../../components/Container';
import colors from '../../../../colors';
import AppLoadingContext from '../../../../AppLoadingContext';
import UserContext from '../../../../UserContext';
import ReadOnlyField from '../../../../components/ReadOnlyField';
import { Accordion } from '../../../../components/Accordion';
import { DATE_DISPLAY_FORMAT } from '../../../../Constants';
import './index.scss';

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
    const statusUpdates = goal.statusChanges && goal.statusChanges.length > 0
      ? goal.statusChanges.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      : [];

    const objectives = goal.objectives || [];

    return {
      id: `goal-${goal.id}`,
      title: `G-${goal.id} | ${goal.status}`,
      expanded: index === 0,
      handleToggle: () => { }, // Add dummy handler to satisfy prop-types
      className: 'view-standard-goals-accordion',
      content: (
        <div className="goal-history-content">
          <div className="goal-updates-section">
            <h3 className="smart-hub-serif">Goal updates</h3>
            {statusUpdates.length > 0 ? (
              <ul className="usa-list" aria-label="Goal status updates">
                {statusUpdates.map((update) => (
                  <li key={update.id}>
                    <strong>
                      {(() => {
                        switch (update.newStatus) {
                          case 'Not Started':
                            return 'Added on';
                          case 'In Progress':
                            return 'Started on';
                          case 'Suspended':
                            return 'Suspended on';
                          case 'Closed':
                            return 'Closed on';
                          case 'Complete':
                            return 'Completed on';
                          default:
                            return `${update.newStatus} on`;
                        }
                      })()}
                    </strong>
                    {' '}
                    <strong>{moment(update.createdAt).format(DATE_DISPLAY_FORMAT)}</strong>
                    {update.user ? ` by ${update.user.name}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="usa-list" aria-label="Goal status updates">
                <li>
                  <strong>
                    {goal.status === 'Not Started' ? 'Added' : `${goal.status}`}
                  </strong>
                  {' '}
                  on
                  {' '}
                  <strong>{moment(goal.createdAt).format(DATE_DISPLAY_FORMAT)}</strong>
                  {goal.goalCollaborators && goal.goalCollaborators.some(
                    (c) => c.collaboratorType && c.collaboratorType.name === 'Creator' && c.user,
                  )
                    ? ` by ${goal.goalCollaborators.find(
                      (c) => c.collaboratorType && c.collaboratorType.name === 'Creator',
                    ).user.name}`
                    : ''}
                </li>
              </ul>
            )}
          </div>

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

          <div className="goal-status-section">
            <ReadOnlyField label="Goal status">
              {goal.status}
            </ReadOnlyField>
          </div>

          {objectives.length > 0 && (
          <div className="objective-section">
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
                              {objective.activityReportObjectives
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

                {/* Display Resources */}
                {!objective.activityReportObjectives
                        || !objective.activityReportObjectives.some(
                          (aro) => aro.resources && aro.resources.length > 0,
                        ) ? null : (
                          <div className="margin-top-2">
                            {/* Render label and list separately to avoid nesting ul in p */}
                            <p className="usa-prose margin-bottom-0 text-bold">Resources</p>
                            <ul className="usa-list margin-top-0">
                              {objective.activityReportObjectives
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
                          </div>
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
