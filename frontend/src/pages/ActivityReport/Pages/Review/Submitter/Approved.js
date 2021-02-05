import React from 'react';
import PropTypes from 'prop-types';

const Approved = ({
  additionalNotes,
  managerNotes,
}) => (
  <>
    <h2>Report approved</h2>
    <div className="smart-hub--creator-notes">
      <p>
        <span className="text-bold">Creator notes</span>
        <br />
        <br />
        { additionalNotes }
      </p>
    </div>
    <div className="smart-hub--creator-notes margin-top-2">
      <p>
        <span className="text-bold">Manager notes</span>
        <br />
        <br />
        { managerNotes }
      </p>
    </div>
  </>
);

Approved.propTypes = {
  additionalNotes: PropTypes.string,
  managerNotes: PropTypes.string,
};

Approved.defaultProps = {
  additionalNotes: 'No creator notes',
  managerNotes: 'No manager notes',
};

export default Approved;
