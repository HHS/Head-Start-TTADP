import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import PropTypes from 'prop-types';
import { Checkbox, Radio } from '@trussworks/react-uswds';
import moment from 'moment';
import StatusDropdown from '../../../../../components/GoalCards/components/StatusDropdown';
import { DATE_DISPLAY_FORMAT } from '../../../../../Constants';
import ObjectiveCard from '../../../../../components/GoalCards/ObjectiveCard';
import ExpanderButton from '../../../../../components/ExpanderButton';
import '../../../../../components/GoalCards/GoalCard.scss';
import { goalPropTypes } from '../../../../../components/GoalCards/constants';
import FlagStatus from '../../../../../components/GoalCards/FlagStatus';
import './GoalCard.css';

function GoalCard({
  goal,
  regionId,
  register,
  isRadio,
  selectedGoalsIncludeCurated,
}) {
  const {
    id, // for keys and such, from the api
    goalStatus,
    createdOn,
    goalText,
    objectiveCount,
    reasons,
    objectives,
    previousStatus,
  } = goal;

  const lastTTA = (() => objectives.reduce((prev, curr) => (new Date(prev) > new Date(curr.endDate) ? prev : curr.endDate), ''))();
  const goalNumbers = goal.goalNumbers.join(', ');

  const [objectivesExpanded, setObjectivesExpanded] = useState(false);

  const closeOrOpenObjectives = () => {
    setObjectivesExpanded(!objectivesExpanded);
  };

  const border = 'smart-hub-border-base-lighter';

  const FormControl = isRadio ? Radio : Checkbox;
  const formControlId = isRadio ? `finalGoalId-${id}` : `selectedGoalIds-${id}`;
  const formControlName = isRadio ? 'finalGoalId' : 'selectedGoalIds';
  const formControlLabel = isRadio ? `Merge ${id}` : `Select ${id}`;
  const registration = isRadio ? { required: true } : null;

  let showFormControl = true;

  if (!register) {
    showFormControl = false;
  }

  if (selectedGoalsIncludeCurated && !goal.isCurated) {
    showFormControl = false;
  }

  const internalLeftMargin = 'margin-left-5';

  return (
    <article
      className={`ttahub-goal-card--merge-card usa-card padding-3 radius-lg border ${border} width-full maxw-full margin-bottom-2`}
      data-testid="goalCard"
    >
      <div className="display-flex flex-justify">
        <div className="display-flex flex-align-start flex-row">
          {showFormControl ? (
            <FormControl
              id={formControlId}
              name={formControlName}
              value={id}
              aria-label={formControlLabel}
              className="margin-right-1"
              inputRef={register(registration)}
            />
          ) : null }
          <StatusDropdown
            showReadOnlyStatus
            goalId={id}
            status={goalStatus}
            previousStatus={previousStatus || 'Not Started'} // Open the escape hatch!
            regionId={regionId}
            onUpdateGoalStatus={() => {}}
            className={showFormControl ? '' : 'margin-left-5'}
          />
        </div>
      </div>
      <div className={`display-flex flex-wrap margin-y-2 ${internalLeftMargin}`}>
        <div className="ttahub-goal-card__goal-column ttahub-goal-card__goal-column__goal-text padding-right-3">
          <h3 className="usa-prose usa-prose margin-y-0">
            Goal
            {' '}
            {goalNumbers}
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
  regionId: PropTypes.string.isRequired,
  register: PropTypes.func,
  isRadio: PropTypes.bool.isRequired,
  selectedGoalsIncludeCurated: PropTypes.bool,
};

GoalCard.defaultProps = {
  register: null,
  selectedGoalsIncludeCurated: false,
};

export default GoalCard;
