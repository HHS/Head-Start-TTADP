import React from 'react';

const GoalFormContext = React.createContext({
  isGoalFormClosed: false,
  toggleGoalForm: () => {},
});

export default GoalFormContext;
