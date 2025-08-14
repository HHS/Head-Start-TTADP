import React from 'react';
import PropTypes from 'prop-types';
import GoalFormTitle from '../GoalForm/GoalFormTitle';

export default function GoalFormTitleGroup({
  goalNumbers,
  isReopenedGoal,
  status,
}) {
  return (
    <>
      <div className="display-flex flex-align-center margin-top-2 margin-bottom-1">
        <GoalFormTitle
          goalNumbers={goalNumbers}
          isReopenedGoal={isReopenedGoal}
        />
        { status.toLowerCase() === 'draft'
          && (
            <span className="usa-tag smart-hub--table-tag-status smart-hub--status-draft padding-x-105 padding-y-1 margin-left-2">Draft</span>
          )}
      </div>
      <div>
        <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
        {' '}
        indicates required field
      </div>
      <h2 className="margin-top-4 margin-bottom-3">Goal summary</h2>
    </>
  );
}

GoalFormTitleGroup.propTypes = {
  goalNumbers: PropTypes.arrayOf(PropTypes.string),
  isReopenedGoal: PropTypes.bool,
  status: PropTypes.string,
};

GoalFormTitleGroup.defaultProps = {
  goalNumbers: [],
  isReopenedGoal: false,
  status: 'Draft',
};
