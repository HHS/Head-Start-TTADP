/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@trussworks/react-uswds';
import moment from 'moment';
import { useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlag } from '@fortawesome/free-solid-svg-icons';
import StatusDropdown from './components/StatusDropdown';
import ContextMenu from '../ContextMenu';
import Tooltip from '../Tooltip';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import { reasonsToMonitor } from '../../pages/ActivityReport/constants';
import ObjectiveCard from './ObjectiveCard';
import ObjectiveButton from './components/ObjectiveButton';
import Topics from './components/Topics';
import './GoalCard.scss';
import colors from '../../colors';

function GoalCard({
  goal,
  recipientId,
  regionId,
  showCloseSuspendGoalModal,
  performGoalStatusUpdate,
  handleGoalCheckboxSelect,
  isChecked,
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

  const lastTTA = useMemo(() => objectives.reduce((prev, curr) => (prev > curr.endDate ? prev : curr.endDate), ''), [objectives]);
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

  const [objectivesExpanded, setObjectivesExpanded] = useState(false);

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

  const closeOrOpenObjectives = () => {
    setObjectivesExpanded(!objectivesExpanded);
  };

  const contextMenuLabel = `Actions for goal ${id}`;
  const showContextMenu = true;
  const menuItems = [
    {
      label: 'Edit',
      onClick: () => {
        history.push(`/recipient-tta-records/${recipientId}/region/${regionId}/goals?id[]=${ids.join(',')}`);
      },
    },
  ];

  return (
    <article className="ttahub-goal-card usa-card margin-x-3 margin-y-2 padding-3 radius-lg border smart-hub-border-base-lighter ">

      <div className="display-flex flex-justify">
        <div className="display-flex flex-align-start flex-row">
          <Checkbox
            id={`goal-select-${id}`}
            label=""
            value={id}
            checked={isChecked}
            onChange={handleGoalCheckboxSelect}
            aria-label={`Select goal ${goalText}`}
            className="margin-right-1"
            data-testid="selectGoalTestId"
          />
          <StatusDropdown
            goalId={id}
            status={goalStatus}
            onUpdateGoalStatus={onUpdateGoalStatus}
            previousStatus={previousStatus}
            regionId={regionId}
          />
        </div>
        {showContextMenu
          ? (
            <ContextMenu
              label={contextMenuLabel}
              menuItems={menuItems}
            />
          )
          : null}
      </div>
      <div className="display-flex flex-wrap margin-y-2 margin-left-5">
        <div className="ttahub-goal-card__goal-column ttahub-goal-card__goal-column__goal-text padding-right-3">
          <h3 className="usa-prose usa-prose margin-y-0">
            Goal
            {' '}
            {goalNumbers}
          </h3>
          <p className="text-wrap usa-prose margin-y-0">
            {goalText}
            {' '}
            {determineFlagStatus()}
          </p>
        </div>
        <div className="ttahub-goal-card__goal-column ttahub-goal-card__goal-column__goal-topics padding-right-3">
          <p className="usa-prose text-bold margin-y-0">Topics</p>
          <Topics topics={goalTopics} />
        </div>
        <div className="ttahub-goal-card__goal-column ttahub-goal-card__goal-column__created-on padding-right-3">
          <p className="usa-prose text-bold  margin-y-0">Created on</p>
          <p className="usa-prose margin-y-0">{moment(createdOn, 'YYYY-MM-DD').format(DATE_DISPLAY_FORMAT)}</p>
        </div>
        <div className="ttahub-goal-card__goal-column ttahub-goal-card__goal-column__last-tta padding-right-3">
          <p className="usa-prose text-bold margin-y-0">Last TTA</p>
          <p className="usa-prose margin-y-0">{lastTTA}</p>
        </div>
        <div className="ttahub-goal-card__goal-column ttahub-goal-card__goal-column__last-reviewed padding-right-3">
          <p className="usa-prose text-bold margin-y-0">Last reviewed</p>
        </div>
      </div>

      <div className="margin-left-5">
        <ObjectiveButton
          closeOrOpenObjectives={closeOrOpenObjectives}
          objectiveCount={objectiveCount}
          objectivesExpanded={objectivesExpanded}
          goalNumber={goal.goalNumbers.join('')}
        />
      </div>
      {objectives.map((obj) => (
        <ObjectiveCard
          key={`objective_${obj.id}`}
          objective={obj}
          objectivesExpanded={objectivesExpanded}
        />
      ))}

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
  showCloseSuspendGoalModal: PropTypes.func.isRequired,
  performGoalStatusUpdate: PropTypes.func.isRequired,
  handleGoalCheckboxSelect: PropTypes.func.isRequired,
  isChecked: PropTypes.bool.isRequired,
};
export default GoalCard;
