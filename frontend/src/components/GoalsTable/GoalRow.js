/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlag } from '@fortawesome/free-solid-svg-icons';
import StatusDropdown from './StatusDropdown';
import ContextMenu from '../ContextMenu';
import Tooltip from '../Tooltip';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import { reasonsToMonitor } from '../../pages/ActivityReport/constants';
import ObjectiveRow from './ObjectiveRow';
import ObjectiveButton from './components/ObjectiveButton';
import './GoalRow.scss';
import './GoalCard.scss';
import colors from '../../colors';

const Topics = ({ topics }) => {
  if (!topics.length) {
    return null;
  }

  const SUBSTRING_LENGTH = 24;

  const truncated = topics.map((topic) => {
    if (topic.length > SUBSTRING_LENGTH) {
      return `${topic.substring(0, SUBSTRING_LENGTH)}...`;
    }

    return topic;
  });

  if (topics.length > 3) {
    const howManyMore = topics.length - 3;
    const tooltipLabel = `+ ${howManyMore} more`;

    return (
      <ul className="usa-list usa-list--unstyled">
        {truncated.slice(0, 3).map((topic) => <li key={topic}>{topic}</li>)}
        <li>
          <Tooltip
            screenReadDisplayText={false}
            displayText={tooltipLabel}
            buttonLabel={topics.slice(-howManyMore).join(' ')}
            tooltipText={topics.slice(-howManyMore).map((topic) => <span key={topic} className="width-card display-block padding-bottom-1">{topic}</span>)}
          />
        </li>
      </ul>
    );
  }

  return (
    <ul className="usa-list usa-list--unstyled">
      {truncated.map((topic) => <li key={topic}>{topic}</li>)}
    </ul>
  );
};

Topics.propTypes = {
  topics: PropTypes.arrayOf(PropTypes.string).isRequired,
};

function GoalCard({
  goal,
  openMenuUp,
  recipientId,
  regionId,
  showCloseSuspendGoalModal,
  performGoalStatusUpdate,
}) {
  const {
    id, // for keys and such, from the api
    ids, // all rolled up ids
    goalStatus,
    createdOn,
    goalText,
    goalTopics,
    objectiveCount,
    reasons,
    objectives,
    previousStatus,
  } = goal;

  const history = useHistory();

  const goalNumbers = goal.goalNumbers.join(', ');

  const onUpdateGoalStatus = (newStatus) => {
    if (newStatus === 'Completed' || newStatus === 'Closed' || newStatus === 'Ceased/Suspended' || newStatus === 'Suspended') {
      // Must provide reason for Close or Suspend.
      showCloseSuspendGoalModal(newStatus, ids, goalStatus);
    } else {
      performGoalStatusUpdate(ids, newStatus, goalStatus);
    }
  };

  const expandObjectivesRef = useRef();

  const [objectivesExpanded, setObjectivesExpanded] = useState(false);

  const mapToDisplay = [
    {
      stored: 'In Progress',
      display: 'In progress',
      color: colors.ttahubMediumBlue,
    },
    {
      stored: 'Completed',
      display: 'Closed',
      color: colors.successDarker,
    },
    {
      stored: 'Draft',
      display: 'Draft',
      color: colors.baseDarkest,
    },
    {
      stored: 'Not Started',
      display: 'Not started',
      color: colors.ttahubOrange,
    },
    {
      stored: 'Ceased/Suspended',
      display: 'Suspended',
      color: colors.errorDark,
    },
  ];

  const determineFlagStatus = () => {
    const reasonsToWatch = reasons.find((t) => reasonsToMonitor.includes(t));
    if (reasonsToWatch) {
      return (
        <>
          <Tooltip
            displayText={<FontAwesomeIcon className="margin-left-1" size="1x" color={colors.error} icon={faFlag} />}
            screenReadDisplayText={false}
            buttonLabel={`Reason for flag on goal ${goalNumbers} is monitoring. Click button to visually reveal this information.`}
            tooltipText="Related to monitoring"
            hideUnderline
          />
        </>
      );
    }
    return null;
  };

  const closeOrOpenObjectives = (collapseFromObjectives) => {
    if (collapseFromObjectives && expandObjectivesRef.current) {
      expandObjectivesRef.current.focus();
    }

    setObjectivesExpanded(!objectivesExpanded);
  };

  const getStatusColor = () => {
    if (goalStatus) {
      const goalStatusDisplay = mapToDisplay.find((m) => m.stored === goalStatus);
      if (goalStatusDisplay) {
        return goalStatusDisplay.color;
      }
    }
    return colors.baseLighter;
  };

  const contextMenuLabel = `Actions for goal ${id}`;
  const showContextMenu = true;
  const menuItems = [
    {
      label: 'Edit',
      onClick: () => {
        history.push(`/recipient-tta-records/${recipientId}/region/${regionId}/goals/${id}`);
      },
    },
  ];

  const containerStyle = objectivesExpanded ? {
    borderLeft: `4px solid ${getStatusColor()}`,
    borderBottom: `1px solid ${colors.baseLighter}`,
    borderRight: `1px solid ${colors.baseLighter}`,
    borderTop: 0,
  } : {
    borderTop: 0,
    borderLeft: `1px solid ${colors.baseLighter}`,
    borderBottom: `1px solid ${colors.baseLighter}`,
    borderRight: `1px solid ${colors.baseLighter}`,
    paddingLeft: '25px',
  };

  return (
    <article className="ttahub-goal-card usa-card margin-x-3 margin-y-2 padding-7 radius-lg border smart-hub-border-base-lighter ">
      <div className="display-flex flex-justify">
        <StatusDropdown
          goalId={id}
          status={goalStatus}
          onUpdateGoalStatus={onUpdateGoalStatus}
          previousStatus={previousStatus}
          regionId={regionId}
          up={openMenuUp}
        />

        {showContextMenu
          ? (
            <ContextMenu
              label={contextMenuLabel}
              menuItems={menuItems}
              up={openMenuUp}
            />
          )
          : null}
      </div>
      <div className="display-flex margin-top-2 flex-wrap">
        <div className="ttahub-goal-card__goal-column ttahub-goal-card__goal-column__goal-text margin-right-3">
          <h2 className="font-body-xs">
            Goal
            {' '}
            {goalNumbers}
          </h2>
          <p className="text-wrap usa-prose">
            {goalText}
            {' '}
            {determineFlagStatus()}
          </p>
        </div>
        <div className="ttahub-goal-card__goal-column ttahub-goal-card__goal-column__goal-topics margin-right-3">
          <p className="text-bold">Topics</p>
          <Topics topics={goalTopics} />
        </div>
        <div className="ttahub-goal-card__goal-column ttahub-goal-card__goal-column__created-on margin-right-3">
          <p className="text-bold">Created on</p>
          <p>{moment(createdOn, 'YYYY-MM-DD').format(DATE_DISPLAY_FORMAT)}</p>
        </div>
        <div className="ttahub-goal-card__goal-column ttahub-goal-card__goal-column__last-tta margin-right-3">
          <p className="text-bold">Last TTA</p>
        </div>
        <div className="ttahub-goal-card__goal-column ttahub-goal-card__goal-column__last-reviewed margin-right-3">
          <p className="text-bold">Last reviewed</p>
        </div>
      </div>

      <ObjectiveButton
        closeOrOpenObjectives={closeOrOpenObjectives}
        objectiveCount={objectiveCount}
        objectivesExpanded={objectivesExpanded}
        goalNumber={goal.goalNumbers.join('')}
        expandObjectivesRef={expandObjectivesRef}
      />

      <p />
      <div
        className="padding-top-0"
        style={containerStyle}
        colSpan="6"
      >
        <ul aria-hidden className="usa-list usa-list--unstyled tta-smarthub--goal-row-obj-table-header padding-top-0 padding-x-2 padding-bottom-1 display-flex">
          <li className="padding-x-105 padding-y-0 padding-left-0 flex-align-self-end">Objective</li>
          <li className="padding-x-105 padding-y-0 flex-align-self-end">Activity reports</li>
          <li className="padding-x-105 padding-y-0 flex-align-self-end">Grant numbers</li>
          <li className="padding-x-105 padding-y-0 flex-align-self-end">End date</li>
          <li className="padding-x-105 padding-y-0 flex-align-self-end">Reasons</li>
          <li className="padding-x-105 padding-y-0 padding-right-0 flex-align-self-end">Objective status</li>
        </ul>
        {objectives.map((obj) => (
          <ObjectiveRow
            key={`objective_${obj.id}`}
            objective={obj}
          />
        ))}
      </div>
    </article>
  );
}

export const objectivePropTypes = PropTypes.shape({
  id: PropTypes.number,
  title: PropTypes.string,
  arNumber: PropTypes.string,
  ttaProvided: PropTypes.string,
  endDate: PropTypes.string,
  reasons: PropTypes.arrayOf(PropTypes.string),
  status: PropTypes.string,
});

export const goalPropTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  ids: PropTypes.arrayOf(PropTypes.number),
  goalStatus: PropTypes.string,
  createdOn: PropTypes.string.isRequired,
  goalText: PropTypes.string.isRequired,
  goalTopics: PropTypes.arrayOf(PropTypes.string).isRequired,
  reasons: PropTypes.arrayOf(PropTypes.string).isRequired,
  objectiveCount: PropTypes.number.isRequired,
  goalNumbers: PropTypes.arrayOf(PropTypes.string.isRequired),
  objectives: PropTypes.arrayOf(objectivePropTypes),
  previousStatus: PropTypes.string,
});

goalPropTypes.defaultProps = {
  goalStatus: null,
  objectives: [],
};
GoalCard.propTypes = {
  goal: goalPropTypes.isRequired,
  recipientId: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
  openMenuUp: PropTypes.bool.isRequired,
  showCloseSuspendGoalModal: PropTypes.func.isRequired,
  performGoalStatusUpdate: PropTypes.func.isRequired,
};
export default GoalCard;
