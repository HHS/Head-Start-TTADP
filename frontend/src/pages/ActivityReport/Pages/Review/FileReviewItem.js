import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';

const APPROVED = 'APPROVED';

const FileReviewItem = ({ filename, url, status }) => {
  const approved = status === APPROVED;
  return (
    <Grid row className="margin-top-1 ">
      <Grid col={6}>
        {filename}
      </Grid>
      <Grid col={6}>
        <div className="flex-align-end display-flex flex-column no-print">
          {approved
          && <a href={url}>Download</a>}
          {!approved
          && <div>Not Approved</div>}
        </div>
      </Grid>
    </Grid>
  );
};

FileReviewItem.propTypes = {
  filename: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
};

export default FileReviewItem;
