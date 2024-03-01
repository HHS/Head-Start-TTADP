/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useMemo, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import PropTypes from 'prop-types';
import { Checkbox, Tag } from '@trussworks/react-uswds';
import { DECIMAL_BASE } from '@ttahub/common';
import moment from 'moment';
import { useHistory } from 'react-router-dom';
import StatusDropdown from './components/StatusDropdown';
import ContextMenu from '../ContextMenu';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import ObjectiveCard from './ObjectiveCard';
import FlagStatus from './FlagStatus';
import ExpanderButton from '../ExpanderButton';
import './GoalCard.scss';
import { goalPropTypes } from './constants';
import colors from '../../colors';
import SessionObjectiveCard from './SessionObjectiveCard';
import isAdmin, { hasApproveActivityReportInRegion } from '../../permissions';
import UserContext from '../../UserContext';
import { deleteGoal } from '../../fetchers/goals';
import AppLoadingContext from '../../AppLoadingContext';

const SESSION_TYPE = 'session';

export const ObjectiveSwitch = ({ objective, objectivesExpanded }) => {
  if (objective.type === SESSION_TYPE) {
    return (
      <SessionObjectiveCard
        objective={objective}
        objectivesExpanded={objectivesExpanded}
      />
    );
  }

  return (
    <ObjectiveCard
      objective={objective}
      objectivesExpanded={objectivesExpanded}
    />
  );
};

ObjectiveSwitch.propTypes = {
  objective: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    type: PropTypes.string,
  }).isRequired,
  objectivesExpanded: PropTypes.bool.isRequired,
};

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
    objectiveCount,
    reasons,
    objectives,
    previousStatus,
    createdVia,
    onAR,
  } = goal;

  const [deleteError, setDeleteError] = useState(false);
  const isMerged = createdVia === 'merge';

  const lastTTA = useMemo(() => objectives.reduce((prev, curr) => (new Date(prev) > new Date(curr.endDate) ? prev : curr.endDate), ''), [objectives]);
  const history = useHistory();

  const goalNumbers = goal.goalNumbers.join(', ');

  const { user } = useContext(UserContext);
  const { setIsAppLoading } = useContext(AppLoadingContext);

  const onUpdateGoalStatus = (newStatus) => {
    if (newStatus === 'Completed' || newStatus === 'Closed' || newStatus === 'Ceased/Suspended' || newStatus === 'Suspended') {
      // Must provide reason for Close or Suspend.
      showCloseSuspendGoalModal(newStatus, ids, goalStatus);
    } else {
      performGoalStatusUpdate(ids, newStatus, goalStatus);
    }
  };

  const [objectivesExpanded, setObjectivesExpanded] = useState(false);

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

  const canDeleteQualifiedGoals = (() => {
    if (isAdmin(user)) {
      return true;
    }

    return hasApproveActivityReportInRegion(user, parseInt(regionId, DECIMAL_BASE));
  })();

  if (canDeleteQualifiedGoals && !onAR && ['Draft', 'Not Started'].includes(goalStatus)) {
    menuItems.push({
      label: 'Delete',
      onClick: async () => {
        try {
          setDeleteError(false);
          setIsAppLoading(true);
          await deleteGoal(ids, regionId);
          history.push(`/recipient-tta-records/${recipientId}/region/${regionId}/rttapa`, { message: 'Goal deleted successfully' });
        } catch (e) {
          setDeleteError(true);
        } finally {
          setIsAppLoading(false);
        }
      },
    });
  }

  const internalLeftMargin = hideCheckbox ? '' : 'desktop:margin-left-5';

  const border = erroneouslySelected || deleteError ? 'smart-hub-border-base-error' : 'smart-hub-border-base-lighter';

  return (
    <article
      className={`ttahub-goal-card usa-card padding-3 radius-lg border ${border} width-full maxw-full margin-bottom-2`}
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
          menuWidthOffset={100}
        />
        )}
      </div>
      <div className={`display-flex flex-wrap margin-y-2 ${internalLeftMargin}`}>
        <div className="ttahub-goal-card__goal-column ttahub-goal-card__goal-column__goal-text padding-right-3">
          <h3 className="usa-prose usa-prose margin-y-0">
            Goal
            {' '}
            {goalNumbers}
            {isMerged && (
            <Tag className="margin-left-1 text-ink text-normal" background={colors.baseLighter}>
              Merged
            </Tag>
            )}
          </h3>
          <p className="text-wrap usa-prose margin-y-0">
            {goalText}
            {' '}
            <FlagStatus
              reasons={reasons}
              goalNumbers={goalNumbers}
            />
          </p>
        </div>
        <div className="ttahub-goal-card__goal-column ttahub-goal-card__goal-column__goal-source padding-right-3">
          <p className="usa-prose text-bold margin-y-0">Goal source</p>
          <p className="usa-prose margin-y-0">{goal.source}</p>
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
        <ExpanderButton
          type="objective"
          ariaLabel={`objectives for goal ${goal.goalNumbers.join('')}`}
          closeOrOpen={closeOrOpenObjectives}
          count={objectiveCount}
          expanded={objectivesExpanded}
        />
      </div>
      {objectives.map((obj) => (
        <ObjectiveSwitch
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
