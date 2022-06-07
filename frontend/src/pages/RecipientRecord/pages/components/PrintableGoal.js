import React from 'react';
import PropTypes from 'prop-types';
import PrintableObjective from './PrintableObjective';

export default function PrintableGoal({ goal }) {
  return (
    <div className="padding-2">
      <h2>
        Goal
        {' '}
        {goal.goalNumber}
      </h2>
      <div className="display-flex padding-105 no-break-within">
        <div className="text-bold width-card-lg">Goal status</div>
        <div className="flex-1">{goal.goalStatus}</div>
      </div>
      <div className="display-flex padding-105 no-break-within">
        <div className="text-bold width-card-lg ">Grant number</div>
        <div className="flex-1">{goal.grantNumber}</div>
      </div>
      <div className="display-flex padding-105  no-break-within">
        <div className="text-bold width-card-lg">Recipient&apos;s goal</div>
        <div className="flex-1">{goal.goalText}</div>
      </div>
      <div className="display-flex padding-105 no-break-within">
        <div className="text-bold width-card-lg">Topics</div>
        <div className="flex-1">{goal.goalTopics.join(', ')}</div>
      </div>
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
    goalNumber: PropTypes.string,
    goalStatus: PropTypes.string,
    grantNumber: PropTypes.string,
    goalText: PropTypes.string,
    goalTopics: PropTypes.arrayOf(PropTypes.string),
    objectives: PropTypes.arrayOf(PropTypes.shape({})),
  }).isRequired,
};
