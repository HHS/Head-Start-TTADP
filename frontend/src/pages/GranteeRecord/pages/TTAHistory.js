import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import Overview from '../../../widgets/DashboardOverview';
import FrequencyGraph from '../../../widgets/FrequencyGraph';

export default function TTAHistory({ filters }) {
  return (
    <div className="margin-right-3">
      <Grid>
        <Grid col={12}>
          <Overview
            fields={[
              'Activity reports',
              'Hours of TTA',
              'Participants',
              'In-person activities',
            ]}
            showTooltips
            filters={filters}
          />
        </Grid>
        <Grid col={8}>
          <FrequencyGraph filters={filters} />
        </Grid>
      </Grid>
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
