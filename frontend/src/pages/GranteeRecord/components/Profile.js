import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import GranteeSummary from './GranteeSummary';
import GrantList from './GrantsList';

export default function Profile({ granteeSummary }) {
  return (
    <div className="margin-right-1">
      <Grid row gap={4}>
        <Grid desktop={{ col: 6 }} tabletLg={{ col: 12 }}>
          <GranteeSummary summary={granteeSummary} />
        </Grid>
        <Grid desktop={{ col: 6 }} tabletLg={{ col: 12 }}>
          <GrantList summary={granteeSummary} />
        </Grid>
      </Grid>
    </div>
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
