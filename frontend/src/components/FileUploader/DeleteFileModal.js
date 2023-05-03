import React from 'react';
import PropTypes from 'prop-types';
import Modal from '../Modal';

const DeleteFileModal = ({
  modalRef, onFileRemoved, files, index,
}) => {
  const onDeleteFile = () => {
    onFileRemoved(index)
      .then(modalRef.current.toggleModal(false));
  };

  return (
    <>
      <Modal
        modalRef={modalRef}
        onOk={onDeleteFile}
        modalId="DeleteFileModal"
        title="Delete File"
        okButtonText="Delete"
        okButtonAriaLabel="This button will permanently delete the file."
      >
        <p>
          Are you sure you want to delete
          {' '}
          {files[index] ? files[index].originalFileName : null}
          {' '}
          ?
        </p>
        <p>This action cannot be undone.</p>
      </Modal>
    </>
  );
};

DeleteFileModal.propTypes = {
  modalRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape(),
  ]).isRequired,
  onFileRemoved: PropTypes.func.isRequired,
  index: PropTypes.number,
  // eslint-disable-next-line react/forbid-prop-types
  files: PropTypes.arrayOf(PropTypes.object).isRequired,
};

DeleteFileModal.defaultProps = {
  index: null,
};

export default DeleteFileModal;
