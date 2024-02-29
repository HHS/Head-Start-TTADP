import React from 'react';
import PropTypes from 'prop-types';
import GoalNudge from './GoalNudge';
import FormFieldThatIsSometimesReadOnly from './FormFieldThatIsSometimesReadOnly';
import GoalText from './GoalText';

export default function GoalName({
  goalName,
  goalNameError,
  setGoalName,
  validateGoalName,
  isAppLoading,
  recipient,
  regionId,
  selectedGrants,
  onSelectNudgedGoal,
  status,
  isOnReport,
  isNew,
  userCanEdit,
  isCurated,
}) {
  return (
    <FormFieldThatIsSometimesReadOnly
      permissions={[
        (!isOnReport),
        (status !== 'Closed'),
        (userCanEdit),
        !isCurated,
      ]}
      label="Recipient's goal"
      value={goalName}
    >
      {isNew ? (
        <GoalNudge
          error={goalNameError}
          goalName={goalName}
          validateGoalName={validateGoalName}
          onUpdateText={setGoalName}
          isLoading={isAppLoading}
          recipientId={recipient.id}
          regionId={regionId}
          selectedGrants={selectedGrants}
          onSelectNudgedGoal={onSelectNudgedGoal}
        />
      ) : (
        <GoalText
          error={goalNameError}
          goalName={goalName}
          validateGoalName={validateGoalName}
          onUpdateText={(e) => {
            setGoalName(e.target.value);
          }}
          goalStatus={status}
          isLoading={isAppLoading}
          isOnReport={isOnReport}
        />
      )}
    </FormFieldThatIsSometimesReadOnly>
  );
}

GoalName.propTypes = {
  goalName: PropTypes.string.isRequired,
  goalNameError: PropTypes.node.isRequired,
  setGoalName: PropTypes.func.isRequired,
  validateGoalName: PropTypes.func.isRequired,
  isAppLoading: PropTypes.bool.isRequired,
  recipient: PropTypes.shape({
    id: PropTypes.number.isRequired,
  }).isRequired,
  regionId: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]).isRequired,
  selectedGrants: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onSelectNudgedGoal: PropTypes.func.isRequired,
  status: PropTypes.string.isRequired,
  isOnReport: PropTypes.bool.isRequired,
  isNew: PropTypes.bool.isRequired,
  userCanEdit: PropTypes.bool.isRequired,
  isCurated: PropTypes.bool,
};

GoalName.defaultProps = {
  isCurated: false,
};
