import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Container from '../../../components/Container';
import './RecipientSummary.css';

export default function RecipientSpotlight({ regionId, recipientId }) {
  const [spotlightData, setSpotlightData] = useState([]);
  useEffect(() => {
    async function fetchRecipientSpotlight() {
      try {
        const response = await getRecipientSpotlight(
          String(recipientId),
          String(regionId),
        );
        setSpotlightData(response);
      } catch (err) {
        setSpotlightData([]);
      }
    }

    fetchRecipientSpotlight();
  }, [recipientId, regionId]);

  return (
    <Container paddingX={0} paddingY={0} className="ttahub--recipient-summary">
      <div className="ttahub-recipient-record--card-header padding-x-3 padding-y-3 margin-bottom-0 margin-top-0">
        <h2 className="margin-0 padding-0">Recipient spotlight</h2>
      </div>
      <div className="padding-x-3 padding-bottom-3" />

    </Container>
  );
}

RecipientSpotlight.propTypes = {
  regionId: PropTypes.number.isRequired,
  recipientId: PropTypes.number.isRequired,
};
