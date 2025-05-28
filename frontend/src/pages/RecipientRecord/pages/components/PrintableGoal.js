import React from 'react';
import PropTypes from 'prop-types';
import PrintableObjective from './PrintableObjective';
import { ROW_CLASS, FIRST_COLUMN_CLASS, SECOND_COLUMN_CLASS } from './constants';
import STATUSES from '../../../../components/GoalCards/components/StatusDropdownStatuses';
import List from './List';

export default function PrintableGoal({ goal }) {
  const key = goal.status || 'Needs Status';
  const { icon } = STATUSES[key] ? STATUSES[key] : STATUSES['Needs Status'];
  const allTopics = goal.objectives && Array.isArray(goal.objectives)
    ? goal.objectives.flatMap((o) => (o.topics && Array.isArray(o.topics) ? o.topics : []))
    : [];
  const uniqueTopics = [...new Set(allTopics)];

  return (
    <div className="ttahub-printable-goal padding-x-3 padding-top-3 padding-bottom-2 margin-top-5 no-break-within">
      <h2 className="margin-top-0 padding-bottom-1 border-bottom-1px">
        Goal
        {' '}
        {goal.goalNumbers ? goal.goalNumbers.join(', ') : `G-${goal.id}`}
      </h2>
      <div className={ROW_CLASS}>
        <p className={FIRST_COLUMN_CLASS}>Goal status</p>
        <p className={SECOND_COLUMN_CLASS}>
          {icon}
          {key}
        </p>
      </div>
      <div className={ROW_CLASS}>
        <p className={FIRST_COLUMN_CLASS}>Grant number</p>
        <p className={SECOND_COLUMN_CLASS}>{goal.grant.number}</p>
      </div>
      <div className={ROW_CLASS}>
        <p className={FIRST_COLUMN_CLASS}>Recipient&apos;s goal</p>
        <p className={SECOND_COLUMN_CLASS}>{goal.name}</p>
      </div>
      {uniqueTopics.length > 0 && (
      <div className={ROW_CLASS}>
        <p className={FIRST_COLUMN_CLASS}>Topics</p>
        <List className={SECOND_COLUMN_CLASS} list={uniqueTopics} />
      </div>
      )}
      { goal.objectives.length > 0 ? (
        <h3 className="padding-x-1">
          Objectives for goal
          {' '}
          {`G-${goal.id}`}
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
    id: PropTypes.number,
    goalNumbers: PropTypes.arrayOf(PropTypes.string), // Optional now
    status: PropTypes.string,
    grant: PropTypes.shape({
      number: PropTypes.string,
    }),
    name: PropTypes.string,
    objectives: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number,
      topics: PropTypes.arrayOf(PropTypes.string),
    })),
  }).isRequired,
};
