import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import './ReadOnly.css';

const GoalSummary = ({ goal }) => (
  <div className="ttahub-goal-form-goal-summary padding-4 margin-y-4">
    <h2 className="margin-top-0">Recipient TTA goal</h2>
    <h3>Goal summary</h3>
    <h4 className="margin-bottom-1">Recipient grant numbers</h4>
    { goal.grants.map((g) => (
      <>
        <span key={g.value}>{g.label}</span>
        <br />
      </>
    )) }
    <h4 className="margin-bottom-1">Goal</h4>
    <p className="margin-top-0">{goal.name}</p>
    {goal.endDate ? (
      <>
        <h4 className="margin-bottom-1">Goal end date</h4>
        <p className="margin-top-0">{moment(goal.endDate, 'yyyy-mm-dd').format('mm/DD/yyyy')}</p>
      </>
    ) : null }
  </div>
);

GoalSummary.propTypes = {
  goal: PropTypes.shape({
    grants: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string,
        value: PropTypes.number,
      }),
    ),
    name: PropTypes.string,
    endDate: PropTypes.string,
  }).isRequired,
};

export default function ReadOnly({ createdGoals }) {
  return createdGoals.map((goal) => <GoalSummary key={goal.id} goal={goal} />);
}

ReadOnly.propTypes = {
  createdGoals: PropTypes.arrayOf(PropTypes.shape({
    grants: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string,
        value: PropTypes.number,
      }),
    ),
    goalName: PropTypes.string,
    endDate: PropTypes.string,
  })).isRequired,
};
