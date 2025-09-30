import React from 'react';
import PropTypes from 'prop-types';
import ReadOnlyEditor from '../../../../components/ReadOnlyEditor';

const DisplayApproverNotes = ({
  approverStatusList,
}) => {
  const showApproverNotes = () => approverStatusList.map((a) => {
    if (!a.note) {
      return null;
    }

    return (
      <div key={`manager-note-${a.user.id}`}>
        <strong>
          {a.user.fullName}
          :
        </strong>
        <ReadOnlyEditor
          value={!a.note || a.note === '<p></p>\n' ? 'No manager notes' : a.note}
          ariaLabel={`Approving Manager Notes from ${a.user.fullName}`}
        />
      </div>
    );
  });

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
    user: PropTypes.shape({
      fullName: PropTypes.string,
    }),
  })).isRequired,
};

export default DisplayApproverNotes;
