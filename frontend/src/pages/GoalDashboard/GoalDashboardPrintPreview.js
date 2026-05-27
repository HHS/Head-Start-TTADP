import { Alert } from '@trussworks/react-uswds';
import moment from 'moment';
import PropTypes from 'prop-types';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import BackLink from '../../components/BackLink';
import STATUSES from '../../components/GoalCards/components/StatusDropdownStatuses';
import PrintToPdf from '../../components/PrintToPDF';
import { fetchGoalDashboardGoalsByIds } from '../../fetchers/goals';
import { toSentenceCase } from '../../utils';
import './GoalDashboardPrintPreview.css';

const DEFAULT_SORT_CONFIG = {
  sortBy: 'goalStatus',
  direction: 'asc',
};

const normalizeGoalIds = (goalIds) =>
  [...new Set([goalIds].flat())]
    .map((goalId) => parseInt(String(goalId), 10))
    .filter((goalId) => Number.isInteger(goalId) && goalId > 0);

const getStatusKey = (status) => {
  const normalizedStatus = String(status || '').toLowerCase();
  return (
    Object.keys(STATUSES).find((statusKey) => statusKey.toLowerCase() === normalizedStatus) ||
    'Needs Status'
  );
};

const formatDate = (value) => {
  if (!value) {
    return 'N/A';
  }

  const formattedDate = moment(value, [moment.ISO_8601, 'YYYY-MM-DD', 'MM/DD/YYYY'], true);
  return formattedDate.isValid() ? formattedDate.format(DATE_DISPLAY_FORMAT) : value;
};

function StatusValue({ status }) {
  const statusConfig = STATUSES[getStatusKey(status)] || STATUSES['Needs Status'];
  const display = statusConfig.display || status || 'Needs status';

  return (
    <span className="ttahub-goal-dashboard-print-preview__status">
      {statusConfig.icon}
      <span>{toSentenceCase(display)}</span>
    </span>
  );
}

StatusValue.propTypes = {
  status: PropTypes.string,
};

StatusValue.defaultProps = {
  status: '',
};

function LabelValuePair({ label, children, wide }) {
  return (
    <div
      className={`ttahub-goal-dashboard-print-preview__pair${
        wide ? ' ttahub-goal-dashboard-print-preview__pair--wide' : ''
      }`}
    >
      <p className="ttahub-goal-dashboard-print-preview__label">{label}</p>
      <div className="ttahub-goal-dashboard-print-preview__value">{children}</div>
    </div>
  );
}

LabelValuePair.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  wide: PropTypes.bool,
};

LabelValuePair.defaultProps = {
  wide: false,
};

function ActivityReportsList({ reports }) {
  if (!reports.length) {
    return 'None';
  }

  return (
    <ul className="ttahub-goal-dashboard-print-preview__activity-reports usa-list usa-list--unstyled">
      {reports.map((report) => (
        <li key={report.id}>
          <a href={`/activity-reports/view/${report.id}`}>{report.displayId}</a>
        </li>
      ))}
    </ul>
  );
}

ActivityReportsList.propTypes = {
  reports: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      displayId: PropTypes.string.isRequired,
    })
  ),
};

ActivityReportsList.defaultProps = {
  reports: [],
};

function goalNumberForDisplay(goal) {
  return goal.goalNumbers?.length ? goal.goalNumbers.join(', ') : `G-${goal.id}`;
}

function GoalDashboardPrintableObjective({ goalNumber, objective }) {
  const topics = objective.topics?.filter(Boolean).join(', ');

  return (
    <div className="ttahub-goal-dashboard-print-preview__objective">
      <h3 className="ttahub-goal-dashboard-print-preview__objective-heading">
        Objectives for goal {goalNumber}
      </h3>
      <div className="ttahub-goal-dashboard-print-preview__pairs">
        <LabelValuePair label="Objective">{objective.title || 'N/A'}</LabelValuePair>
        <LabelValuePair label="Activity reports">
          <ActivityReportsList reports={objective.activityReports || []} />
        </LabelValuePair>
        <LabelValuePair label="End date">{formatDate(objective.endDate)}</LabelValuePair>
        {topics ? <LabelValuePair label="Topics">{topics}</LabelValuePair> : null}
        <LabelValuePair label="Objective status">
          <StatusValue status={objective.status} />
        </LabelValuePair>
      </div>
    </div>
  );
}

GoalDashboardPrintableObjective.propTypes = {
  goalNumber: PropTypes.string.isRequired,
  objective: PropTypes.shape({
    title: PropTypes.string,
    activityReports: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
        displayId: PropTypes.string.isRequired,
      })
    ),
    endDate: PropTypes.string,
    topics: PropTypes.arrayOf(PropTypes.string),
    status: PropTypes.string,
  }).isRequired,
};

function GoalDashboardPrintableGoal({ goal }) {
  const goalNumber = goalNumberForDisplay(goal);
  const recipientName = goal.grant?.recipient?.name || 'Recipient';
  const grantNumbers = goal.grantNumbers?.filter(Boolean).join(', ') || goal.grant?.number || 'N/A';

  return (
    <section className="ttahub-goal-dashboard-print-preview__goal no-break-within">
      <h2 className="ttahub-goal-dashboard-print-preview__goal-heading">
        {recipientName} - Goal {goalNumber}
      </h2>
      <div className="ttahub-goal-dashboard-print-preview__pairs">
        <LabelValuePair label="Goal status">
          <StatusValue status={goal.status || goal.goalStatus} />
        </LabelValuePair>
        <LabelValuePair label="Added on">
          {formatDate(goal.createdAt || goal.createdOn)}
        </LabelValuePair>
        <LabelValuePair label="Grant numbers">{grantNumbers}</LabelValuePair>
        <LabelValuePair label="Recipient's goal" wide>
          {goal.name || goal.goalText || 'N/A'}
        </LabelValuePair>
      </div>
      {goal.objectives?.map((objective) => (
        <GoalDashboardPrintableObjective
          key={objective.id}
          goalNumber={goalNumber}
          objective={objective}
        />
      ))}
    </section>
  );
}

GoalDashboardPrintableGoal.propTypes = {
  goal: PropTypes.shape({
    id: PropTypes.number.isRequired,
    goalNumbers: PropTypes.arrayOf(PropTypes.string),
    status: PropTypes.string,
    goalStatus: PropTypes.string,
    createdAt: PropTypes.string,
    createdOn: PropTypes.string,
    name: PropTypes.string,
    goalText: PropTypes.string,
    grantNumbers: PropTypes.arrayOf(PropTypes.string),
    grant: PropTypes.shape({
      number: PropTypes.string,
      recipient: PropTypes.shape({
        name: PropTypes.string,
      }),
    }),
    objectives: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
      })
    ),
  }).isRequired,
};

export default function GoalDashboardPrintPreview() {
  const location = useLocation();
  const goalDashboardState = location.state?.goalDashboardState || {};
  const previewGoalIds = useMemo(
    () =>
      normalizeGoalIds(
        location.state?.previewGoalIds?.length
          ? location.state.previewGoalIds
          : goalDashboardState.selectedGoalIds
      ),
    [goalDashboardState.selectedGoalIds, location.state?.previewGoalIds]
  );
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function fetchGoals() {
      if (!previewGoalIds.length) {
        setGoals([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams();
        const sortConfig = goalDashboardState.sortConfig || DEFAULT_SORT_CONFIG;
        params.set('sortBy', sortConfig.sortBy || DEFAULT_SORT_CONFIG.sortBy);
        params.set('direction', sortConfig.direction || DEFAULT_SORT_CONFIG.direction);
        const response = await fetchGoalDashboardGoalsByIds(params.toString(), previewGoalIds);

        if (isMounted) {
          setGoals(response?.goalRows || []);
          setFetchError('');
        }
      } catch (_error) {
        if (isMounted) {
          setGoals([]);
          setFetchError('Unable to fetch goal dashboard goals');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchGoals();

    return () => {
      isMounted = false;
    };
  }, [goalDashboardState.sortConfig, previewGoalIds]);

  const backLinkTo = {
    pathname: '/dashboards/goal-dashboard',
    state: {
      goalDashboardState,
    },
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!previewGoalIds.length) {
    return (
      <div className="ttahub-goal-dashboard-print-preview margin-top-2">
        <BackLink to={backLinkTo}>Back to goals table</BackLink>
        <Alert type="info" headingLevel="h2" heading={<>No goals selected</>}>
          <span className="usa-prose">Select goals before previewing and printing.</span>
        </Alert>
      </div>
    );
  }

  if (fetchError || !goals.length) {
    return (
      <div className="ttahub-goal-dashboard-print-preview margin-top-2">
        <BackLink to={backLinkTo}>Back to goals table</BackLink>
        <Alert
          type="info"
          headingLevel="h2"
          heading={fetchError ? 'Something went wrong' : 'No goals found'}
        >
          <span className="usa-prose">
            {fetchError || 'No matching goals were found. Please go back and try again.'}
          </span>
        </Alert>
      </div>
    );
  }

  return (
    <div className="ttahub-goal-dashboard-print-preview margin-top-2">
      <BackLink to={backLinkTo} bottomMargin={3}>
        Back to goals table
      </BackLink>
      <h1 className="page-heading margin-top-0 margin-bottom-3">TTA goals and objectives</h1>
      <PrintToPdf id="goal-dashboard-print-preview" className="margin-bottom-3" />
      <div className="ttahub-goal-dashboard-print-preview__container bg-white radius-md shadow-2">
        {goals.map((goal) => (
          <GoalDashboardPrintableGoal key={`goal-dashboard-print-goal-${goal.id}`} goal={goal} />
        ))}
      </div>
    </div>
  );
}
