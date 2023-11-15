import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import Container from '../../../../components/Container';
import getClassScores from '../../../../fetchers/monitoring';

const ClassReview = ({ grantId }) => {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    const fetchScores = async () => {
      const data = await getClassScores(grantId);
      setScores(data);
    };
    fetchScores();
  });

  return (
    <Container paddingX={0} paddingY={0} className="smart-hub--overflow-auto">
      <div className="ttahub-recipient-record--card-header padding-x-3 padding-y-3 margin-bottom-0 margin-top-0 display-flex flex-row flex-justify">
        <h2 className="margin-0 padding-0">CLASS® review</h2>
        <Button unstyled className="display-flex flex-align-center">
          HSES CLASS
          {' '}
          <FontAwesomeIcon icon={faExternalLinkAlt} size="sm" className="margin-left-1" />
        </Button>
      </div>
      Grant
      {' '}
      {grantId}
    </Container>
  );
};

ClassReview.propTypes = {
  grantId: PropTypes.string.isRequired,
};

export default ClassReview;
