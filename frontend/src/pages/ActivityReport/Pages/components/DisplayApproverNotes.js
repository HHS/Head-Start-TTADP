import React from 'react';
import PropTypes from 'prop-types';
import ReadOnlyEditor from '../../../../components/ReadOnlyEditor';

const DisplayApproverNotes = ({
  approverStatusList,
}) => {
  const showApproverNotes = () => approverStatusList.map((a) => (
    <div key={`manager-note-${a.User.id}`}>
      <strong>
        {a.User.fullName}
        :
      </strong>
      <ReadOnlyEditor
        value={!a.note || a.note === '<p></p>\n' ? 'No manager notes' : a.note}
        ariaLabel={`Approving Manager Notes from ${a.User.fullName}`}
      />
    </div>
  ));

  return (
    <>
      {
        showApproverNotes()
        }
    </>
  );
};

DisplayApproverNotes.propTypes = {
  approverStatusList: PropTypes.arrayOf(PropTypes.shape({
    note: PropTypes.string,
    User: PropTypes.shape({
      fullName: PropTypes.string,
    }),
  })).isRequired,
};

export default DisplayApproverNotes;
