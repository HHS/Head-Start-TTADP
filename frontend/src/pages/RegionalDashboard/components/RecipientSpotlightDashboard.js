import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { GridContainer } from '@trussworks/react-uswds';
import RecipientSpotlightDataController from './RecipientSpotlightDataController';
import './RecipientSpotlightDashboard.scss';

export default function RecipientSpotlightDashboard({
  filtersToApply,
  regionId,
  userHasOnlyOneRegion,
}) {
  return (
    <>
      <Helmet>
        <title>Regional Dashboard - Recipient spotlight</title>
      </Helmet>
      <GridContainer className="smart-hub--recipient-spotlight-dashboard margin-0 padding-0">
        <RecipientSpotlightDataController
          filters={filtersToApply}
          regionId={regionId}
          userHasOnlyOneRegion={userHasOnlyOneRegion}
        />
      </GridContainer>
    </>
  );
}

RecipientSpotlightDashboard.propTypes = {
  filtersToApply: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  userHasOnlyOneRegion: PropTypes.bool.isRequired,
};

RecipientSpotlightDashboard.defaultProps = {
  regionId: undefined,
};
