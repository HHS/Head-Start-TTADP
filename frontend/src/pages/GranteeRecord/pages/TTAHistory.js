import React from 'react';
import PropTypes from 'prop-types';
import Overview from '../../../widgets/DashboardOverview';

export default function TTAHistory({ filters }) {
  return (
    <div className="margin-right-3">
      <Overview
        fields={[
          'Activity reports',
          'Participants',
          'Hours of TTA',
          'In-person activities',
        ]}
        filters={filters}
      />

    </div>
  );
}

TTAHistory.propTypes = {
  filters: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    topic: PropTypes.string,
    condition: PropTypes.string,
    query: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  })),
};

TTAHistory.defaultProps = {
  filters: [],
};
