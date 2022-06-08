import React from 'react';
// import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Alert } from '@trussworks/react-uswds';
import PrintableGoal from './components/PrintableGoal';
import PrintToPdf from '../../../components/PrintToPDF';
import './PrintGoals.css';

export default function PrintGoals({ location }) {
  const selectedGoals = location.state && location.state.selectedGoals
    ? location.state.selectedGoals
    : [];

  if (!selectedGoals.length) {
    return (
      <Alert type="info" headingLevel="h2" heading={<>Something went wrong</>}>
        <span className="usa-prose">Select goals before printing.</span>
      </Alert>
    );
  }

  return (
    <div className="margin-top-2 margin-left-2 ttahub-print-goals">
      <PrintToPdf />
      <div className="bg-white radius-md shadow-2 margin-top-3 margin-right-2">
        {selectedGoals.map((goal) => <PrintableGoal key={goal.id} goal={goal} />)}
      </div>
    </div>
  );
}

PrintGoals.propTypes = {
  location: ReactRouterPropTypes.location.isRequired,
};
