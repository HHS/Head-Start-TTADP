import React from 'react';

const GoalFormContext = React.createContext({
  isGoalFormClosed: false,
  toggleGoalForm: () => {},
  toggleObjectiveForm: () => {},
});

export default GoalFormContext;
