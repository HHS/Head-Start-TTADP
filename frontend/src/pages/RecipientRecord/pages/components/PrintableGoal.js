import React from 'react';
import PropTypes from 'prop-types';
import PrintableObjective from './PrintableObjective';
import { ROW_CLASS, FIRST_COLUMN_CLASS, SECOND_COLUMN_CLASS } from './constants';
import STATUSES from '../../../../components/GoalCards/components/StatusDropdownStatuses';
import List from './List';

export default function PrintableGoal({ goal }) {
  const key = goal.goalStatus || 'Needs Status';
  const { icon } = STATUSES[key] ? STATUSES[key] : STATUSES['Needs Status'];

  return (
    <div className="ttahub-printable-goal padding-x-3 padding-top-3 padding-bottom-2 margin-top-5 no-break-within">
      <h2 className="margin-top-0 padding-bottom-1 border-bottom-1px">
        Goal
        {' '}
        {goal.goalNumbers.join(', ')}
      </h2>
      <div className={ROW_CLASS}>
        <p className={FIRST_COLUMN_CLASS}>Goal status</p>
        <p className={SECOND_COLUMN_CLASS}>
          {icon}
          {key}
        </p>
      </div>
      <div className={ROW_CLASS}>
        <p className={FIRST_COLUMN_CLASS}>Grant numbers</p>
        <p className={SECOND_COLUMN_CLASS}>{goal.grantNumbers.join(', ')}</p>
      </div>
      <div className={ROW_CLASS}>
        <p className={FIRST_COLUMN_CLASS}>Recipient&apos;s goal</p>
        <p className={SECOND_COLUMN_CLASS}>{goal.goalText}</p>
      </div>
      <div className={ROW_CLASS}>
        <p className={FIRST_COLUMN_CLASS}>Topics</p>
        <List className={SECOND_COLUMN_CLASS} list={goal.goalTopics} />
      </div>
      { goal.objectives.length > 0 ? (
        <h3 className="padding-x-1">
          Objectives for goal
          {' '}
          {goal.goalNumbers.join(', ')}
        </h3>
      ) : null }
      {goal.objectives.map(((objective) => (
        <PrintableObjective
          key={objective.id}
          objective={objective}
        />
      )))}
    </div>
  );
}

PrintableGoal.propTypes = {
  goal: PropTypes.shape({
    goalNumbers: PropTypes.arrayOf(PropTypes.string),
    goalStatus: PropTypes.string,
    grantNumbers: PropTypes.arrayOf(PropTypes.string),
    goalText: PropTypes.string,
    goalTopics: PropTypes.arrayOf(PropTypes.string),
    objectives: PropTypes.arrayOf(PropTypes.shape({})),
  }).isRequired,
};
