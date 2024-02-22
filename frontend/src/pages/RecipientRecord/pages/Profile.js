import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid } from '@trussworks/react-uswds';
import RecipientSummary from '../components/RecipientSummary';
import GrantList from '../components/GrantsList';
import RecipientLeadership from '../components/RecipientLeadership';
import './Profile.css';

export default function Profile({
  recipientSummary,
  regionId,
  recipientId,
}) {
  return (
    <>
      <Helmet>
        <title>Profile</title>
      </Helmet>
      <div className="maxw-widescreen">
        <Grid row gap={4}>
          <Grid desktop={{ col: 3 }} tabletLg={{ col: 12 }}>
            <RecipientSummary summary={recipientSummary} regionId={regionId} />
          </Grid>
          <Grid desktop={{ col: 9 }} tabletLg={{ col: 12 }}>
            <RecipientLeadership recipientId={recipientId} regionId={regionId} />
            <GrantList summary={recipientSummary} />
          </Grid>
        </Grid>
      </div>
    </>
  );
}

Profile.propTypes = {
  recipientId: PropTypes.number.isRequired,
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  recipientSummary:
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
