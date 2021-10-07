import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import GranteeSummary from './GranteeSummary';
import GrantList from './GrantsList';

export default function Profile({ granteeSummary }) {
  return (
    <Grid row gap={4} className="margin-left-2">
      <Grid col={6}>
        <GranteeSummary summary={granteeSummary} />
      </Grid>
      <Grid col={6}>
        <GrantList summary={granteeSummary} />
      </Grid>
    </Grid>
  );
}

Profile.propTypes = {
  granteeSummary:
    PropTypes.shape({
      grants: PropTypes.arrayOf(
        PropTypes.shape({
          number: PropTypes.string,
          status: PropTypes.string,
          endDate: PropTypes.string,
        }),
      ),
    }).isRequired,
};
