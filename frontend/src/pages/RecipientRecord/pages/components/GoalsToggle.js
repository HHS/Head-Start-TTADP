import React from 'react';
import PropTypes from 'prop-types';
import {
  Button,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAngleUp,
  faAngleDown,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import colors from '../../../../colors';
import GoalCard from '../../../../components/GoalCards/GoalCard';

export default function GoalsToggle({
  showGoals,
  setShowGoals,
  goalIds,
  goals,
  recipientId,
  regionId,
  onRemove,
}) {
  return (
    <>
      <Button
        type="button"
        className="usa-button--outline usa-button text-no-underline text-middle tta-smarthub--goal-row-objectives tta-smarthub--goal-row-objectives-enabled"
        onClick={() => {
          setShowGoals(!showGoals);
        }}
      >
        View goals
        {goalIds > 1 ? 's' : ''}
        <strong className="margin-left-1">
          (
          {goalIds.length}
          )
        </strong>
        <FontAwesomeIcon className="margin-left-1" size="1x" color={colors.ttahubMediumBlue} icon={showGoals ? faAngleUp : faAngleDown} />
      </Button>

      { showGoals && (
        goals.map((goal) => (
          <div className="display-flex flex-align">
            <GoalCard
              goal={goal}
              recipientId={recipientId}
              regionId={regionId}
              showCloseSuspendGoalModal={false}
              performGoalStatusUpdate={false}
              handleGoalCheckboxSelect={false}
              hideCheckbox
              showReadOnlyStatus
              isChecked={false}
              hideGoalOptions
              marginX={0}
              marginY={2}
            />
            { onRemove ? (
              <Button
                type="button"
                onClick={() => {
                  onRemove(goal);
                }}
                className="flex-align-self-center"
                unstyled
              >
                <FontAwesomeIcon className="margin-left-1 margin-top-2" color={colors.textInk} icon={faTrashCan} />
              </Button>
            ) : null }
          </div>
        ))
      )}
    </>
  );
}

GoalsToggle.propTypes = {
  showGoals: PropTypes.bool.isRequired,
  setShowGoals: PropTypes.func.isRequired,
  goalIds: PropTypes.arrayOf(PropTypes.number).isRequired,
  goals: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
  })).isRequired,
  recipientId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  regionId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  onRemove: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
};

GoalsToggle.defaultProps = {
  onRemove: false,
};
