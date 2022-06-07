import React from 'react';
// import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import PrintableGoal from './components/PrintableGoal';
import PrintToPdf from '../../../components/PrintToPDF';

export default function PrintGoals({ location }) {
  const selectedGoals = location.state && location.state.selectedGoals
    ? location.state.selectedGoals
    : [];

  return (
    <>
      <PrintToPdf />
      <div className="bg-white radius-md shadow-2 margin-top-2 margin-right-2">
        {selectedGoals.map((goal) => <PrintableGoal key={goal.id} goal={goal} />)}
      </div>
    </>
  );
}

PrintGoals.propTypes = {
  location: ReactRouterPropTypes.location.isRequired,
};
