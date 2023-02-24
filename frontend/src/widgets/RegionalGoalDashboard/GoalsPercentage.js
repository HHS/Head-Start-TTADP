import React from 'react';
import PropTypes from 'prop-types';
import withWidgetData from '../withWidgetData';

export function GoalsPercentageWidget({ data, loading }) {
  if (loading) return (<div>Loading...</div>);

  return (
    <div className="goals-percentage-widget">
      {JSON.stringify(data)}
    </div>
  );
}

GoalsPercentageWidget.propTypes = {
  data: PropTypes.shape({

  }).isRequired,
  loading: PropTypes.bool.isRequired,
};

export default withWidgetData(GoalsPercentageWidget, 'goalsPercentage');
