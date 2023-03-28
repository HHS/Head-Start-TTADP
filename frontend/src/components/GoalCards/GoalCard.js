/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import PropTypes from 'prop-types';
import { Checkbox, Tag } from '@trussworks/react-uswds';
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
import { goalPropTypes } from './constants';

function GoalCard({
  goal,
  recipientId,
  regionId,
  showCloseSuspendGoalModal,
  performGoalStatusUpdate,
  handleGoalCheckboxSelect,
  isChecked,
  hideCheckbox,
  showReadOnlyStatus,
  hideGoalOptions,
  erroneouslySelected,
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
    isRttapa,
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
  const menuItems = [
    {
      label: goalStatus === 'Closed' ? 'View' : 'Edit',
      onClick: () => {
        history.push(`/recipient-tta-records/${recipientId}/region/${regionId}/goals?id[]=${ids.join(',')}`);
      },
    },
  ];

  const internalLeftMargin = hideCheckbox ? '' : 'margin-left-5';

  const border = erroneouslySelected ? 'smart-hub-border-base-error' : 'smart-hub-border-base-lighter';

  return (
    <article
      className={`ttahub-goal-card usa-card padding-3 radius-lg border ${border} width-full maxw-full`}
      data-testid="goalCard"
    >
      <div className="display-flex flex-justify">
        <div className="display-flex flex-align-start flex-row">
          { !hideCheckbox && (
          <Checkbox
            id={`goal-select-${id}`}
            label=""
            value={id}
            checked={isChecked}
            onChange={handleGoalCheckboxSelect}
            aria-label={`Select goal ${goalText}`}
            className="margin-right-1"
            data-testid="selectGoalTestId"
            data-goalIds={ids}
          />
          )}
          <StatusDropdown
            showReadOnlyStatus={showReadOnlyStatus}
            goalId={id}
            status={goalStatus}
            onUpdateGoalStatus={onUpdateGoalStatus}
            previousStatus={previousStatus || 'Not Started'} // Open the escape hatch!
            regionId={regionId}
          />
        </div>
        { !hideGoalOptions && (
        <ContextMenu
          label={contextMenuLabel}
          menuItems={menuItems}
        />
        )}
      </div>
      <div className={`display-flex flex-wrap margin-y-2 ${internalLeftMargin}`}>
        <div className="ttahub-goal-card__goal-column ttahub-goal-card__goal-column__goal-text padding-right-3">
          <h3 className="usa-prose usa-prose margin-y-0">
            Goal
            {' '}
            {goalNumbers}
            { isRttapa === 'Yes' ? <Tag className="margin-left-1 text-ink" background={colors.baseLighter}>RTTAPA</Tag> : null }
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

      <div className={internalLeftMargin}>
        <ObjectiveButton
          closeOrOpenObjectives={closeOrOpenObjectives}
          objectiveCount={objectiveCount}
          objectivesExpanded={objectivesExpanded}
          goalNumber={goal.goalNumbers.join('')}
        />
      </div>
      {objectives.map((obj) => (
        <ObjectiveCard
          key={`objective_${uuidv4()}`}
          objective={obj}
          objectivesExpanded={objectivesExpanded}
        />
      ))}

    </article>
  );
}

GoalCard.propTypes = {
  goal: goalPropTypes.isRequired,
  recipientId: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
  showCloseSuspendGoalModal: PropTypes.func.isRequired,
  performGoalStatusUpdate: PropTypes.func.isRequired,
  handleGoalCheckboxSelect: PropTypes.func.isRequired,
  isChecked: PropTypes.bool.isRequired,
  hideCheckbox: PropTypes.bool,
  showReadOnlyStatus: PropTypes.bool,
  hideGoalOptions: PropTypes.bool,
  erroneouslySelected: PropTypes.bool,
};

GoalCard.defaultProps = {
  hideCheckbox: false,
  showReadOnlyStatus: false,
  hideGoalOptions: false,
  erroneouslySelected: false,
};

export default GoalCard;
