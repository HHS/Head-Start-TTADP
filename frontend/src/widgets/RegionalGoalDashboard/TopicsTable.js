import React from 'react';
import PropTypes from 'prop-types';
import withWidgetData from '../withWidgetData';

export function TopicsTable({ data, loading }) {
  if (loading) return (<div>Loading...</div>);

  return (
    <div>..</div>
  );
}

TopicsTable.propTypes = {
  data: PropTypes.shape({
    numerator: PropTypes.number,
    denominator: PropTypes.number,
    percentage: PropTypes.number,
  }).isRequired,
  loading: PropTypes.bool.isRequired,
};

export default withWidgetData(TopicsTable, 'topicsTable');
