import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Button } from '@trussworks/react-uswds';

const ReviewSubmit = ({ allComplete, onSubmit }) => (
  <>
    <Helmet>
      <title>Review and submit</title>
    </Helmet>
    <div>
      Review and submit
      <Button disabled={!allComplete} onClick={onSubmit}>Submit</Button>
    </div>
  </>
);

ReviewSubmit.propTypes = {
  allComplete: PropTypes.bool.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default ReviewSubmit;
