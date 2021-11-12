import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid } from '@trussworks/react-uswds';
import GranteeSummary from '../components/GranteeSummary';
import GrantList from '../components/GrantsList';

export default function Profile({ granteeSummary, regionId, granteeName }) {
  return (
    <>
      <Helmet>
        <title>
          Grantee Profile -
          {' '}
          {granteeName}
        </title>
      </Helmet>
      <div className="margin-right-1">
        <Grid row gap={4}>
          <Grid desktop={{ col: 3 }} tabletLg={{ col: 12 }}>
            <GranteeSummary summary={granteeSummary} regionId={regionId} />
          </Grid>
          <Grid desktop={{ col: 9 }} tabletLg={{ col: 12 }}>
            <GrantList summary={granteeSummary} />
          </Grid>
        </Grid>
      </div>
    </>
  );
}

Profile.propTypes = {
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
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
  granteeName: PropTypes.string,
};

Profile.defaultProps = {
  granteeName: '',
};
