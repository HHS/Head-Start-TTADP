import React from 'react';
import PropTypes from 'prop-types';
import GoalNudge from './GoalNudge';
import PermissionsBasedFormField from './PermissionsBasedFormField';
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
}) {
  return (
    <PermissionsBasedFormField
      permissions={[
        (!isOnReport),
        (status !== 'Closed'),
        (userCanEdit),
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
    </PermissionsBasedFormField>
  );
}

GoalName.propTypes = {
  goalName: PropTypes.string.isRequired,
  goalNameError: PropTypes.string.isRequired,
  setGoalName: PropTypes.func.isRequired,
  validateGoalName: PropTypes.func.isRequired,
  isAppLoading: PropTypes.bool.isRequired,
  recipient: PropTypes.shape({
    id: PropTypes.number.isRequired,
  }).isRequired,
  regionId: PropTypes.number.isRequired,
  selectedGrants: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onSelectNudgedGoal: PropTypes.func.isRequired,
  status: PropTypes.string.isRequired,
  isOnReport: PropTypes.bool.isRequired,
  isNew: PropTypes.bool.isRequired,
  userCanEdit: PropTypes.bool.isRequired,
};
