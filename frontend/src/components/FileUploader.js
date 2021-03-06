/*
  Uses `react-dropzone` to allow file uploads. Must be placed inside a `react-hook-form`
  form. Selected files display below the main input in a 2 by 2 grid.
*/
// react-dropzone examples all use prop spreading. Disabling the eslint no prop spreading
// rules https://github.com/react-dropzone/react-dropzone
/* eslint-disable react/jsx-props-no-spreading */
import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDropzone } from 'react-dropzone';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import {
  Button, Alert, Modal, connectModal,
} from '@trussworks/react-uswds';
import { uploadFile, deleteFile } from '../fetchers/File';

import './FileUploader.css';

export const upload = async (file, reportId, setErrorMessage) => {
  let res;
  try {
    const data = new FormData();
    data.append('reportId', reportId);
    data.append('file', file);
    res = await uploadFile(data);
  } catch (error) {
    setErrorMessage(`${file.name} failed to upload`);
    // eslint-disable-next-line no-console
    console.log(error);
    return null;
  }
  setErrorMessage(null);
  return {
    id: res.id, originalFileName: file.name, fileSize: file.size, status: 'UPLOADED', url: res.url,
  };
};

export const handleDrop = async (e, reportId, id, onChange, setErrorMessage) => {
  if (reportId === 'new') {
    setErrorMessage('Cannot save attachments without a Grantee or Non-Grantee selected');
    return;
  }
  const newFiles = e.map((file) => upload(file, reportId, setErrorMessage));
  Promise.all(newFiles).then((values) => {
    onChange(values);
  });
};

function Dropzone(props) {
  const { onChange, id, reportId } = props;
  const [errorMessage, setErrorMessage] = useState();
  const onDrop = (e) => handleDrop(e, reportId, id, onChange, setErrorMessage);

  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: 'image/*, .pdf, .docx, .xlsx, .pptx, .doc, .xls, .ppt, .zip' });

  return (
    <div
      {...getRootProps()}
    >
      <input {...getInputProps()} />
      <button type="button" className="usa-button usa-button--outline">
        Upload Resources
      </button>
      {errorMessage
        && (
          <Alert type="error" slim noIcon className="smart-hub--save-alert">
            {errorMessage}
          </Alert>
        )}
    </div>
  );
}

Dropzone.propTypes = {
  onChange: PropTypes.func.isRequired,
  reportId: PropTypes.node.isRequired,
  id: PropTypes.string.isRequired,
};

export const getStatus = (status) => {
  switch (status) {
    case 'UPLOADING':
      return 'Uploading';
    case 'UPLOADED':
      return 'Uploaded';
    case 'UPLOAD_FAILED':
      return 'Upload Failed';
    case 'SCANNING_QUEUED':
      return 'Scanning';
    case 'QUEUEING_FAILED':
      return 'Upload Failed';
    case 'SCANNING':
      return 'Scanning';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    default:
      break;
  }
  return 'Upload Failed';
};

const DeleteFileModal = ({
  onFileRemoved, files, index, closeModal,
}) => {
  const deleteModal = useRef(null);
  const onClose = () => {
    onFileRemoved(index)
      .then(closeModal());
  };
  useEffect(() => {
    deleteModal.current.querySelector('button').focus();
  });
  return (
    <div role="dialog" aria-modal="true" ref={deleteModal}>
      <Modal
        title={<h2>Delete File</h2>}
        actions={(
          <>
            <Button type="button" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="button" secondary onClick={onClose}>
              Delete
            </Button>
          </>
    )}
      >
        <p>
          Are you sure you want to delete
          {' '}
          {files[index].originalFileName}
          {' '}
          ?
        </p>
        <p>This action cannot be undone.</p>
      </Modal>
    </div>
  );
};

DeleteFileModal.propTypes = {
  onFileRemoved: PropTypes.func.isRequired,
  closeModal: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
  files: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const ConnectedDeleteFileModal = connectModal(DeleteFileModal);

const FileTable = ({ onFileRemoved, files }) => {
  const [index, setIndex] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const closeModal = () => setIsOpen(false);

  const handleDelete = (newIndex) => {
    setIndex(newIndex);
    setIsOpen(true);
  };

  return (
    <div className="files-table--container margin-top-2">
      <ConnectedDeleteFileModal
        onFileRemoved={onFileRemoved}
        files={files}
        index={index}
        isOpen={isOpen}
        closeModal={closeModal}
      />
      <table className="files-table">
        <thead className="files-table--thead" bgcolor="#F8F8F8">
          <tr>
            <th width="50%">
              Name
            </th>
            <th width="20%">
              Size
            </th>
            <th width="20%">
              Status
            </th>
            <th width="10%" aria-label="remove file" />

          </tr>
        </thead>
        <tbody>
          {files.map((file, currentIndex) => (
            <tr key={`file-${file.id}`} id={`files-table-row-${currentIndex}`}>
              <td className="files-table--file-name">
                {file.originalFileName}
              </td>
              <td>
                {`${(file.fileSize / 1000).toFixed(1)} KB`}
              </td>
              <td>
                {getStatus(file.status)}
              </td>
              <td>
                <Button
                  type="button"
                  className="smart-hub--file-tag-button"
                  unstyled
                  aria-label="remove file"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(currentIndex);
                  }}
                >
                  <span className="fa-sm">
                    <FontAwesomeIcon color="black" icon={faTrash} />
                  </span>
                </Button>
              </td>

            </tr>
          ))}
        </tbody>
      </table>
      { files.length === 0 && (
      <p className="files-table--empty">No files uploaded</p>
      )}
    </div>
  );
};

FileTable.propTypes = {
  onFileRemoved: PropTypes.func.isRequired,
  files: PropTypes.arrayOf(PropTypes.object),
};
FileTable.defaultProps = {
  files: [],
};
const FileUploader = ({
  onChange, files, reportId, id,
}) => {
  const onFilesAdded = (newFiles) => {
    onChange([...files, ...newFiles]);
  };

  const onFileRemoved = async (removedFileIndex) => {
    const file = files[removedFileIndex];
    const remainingFiles = files.filter((f) => f.id !== file.id);
    onChange(remainingFiles);
    await deleteFile(file.id, reportId);
  };

  return (
    <>
      <Dropzone id={id} reportId={reportId} onChange={onFilesAdded} />
      <FileTable onFileRemoved={onFileRemoved} files={files} />

    </>
  );
};

FileUploader.propTypes = {
  onChange: PropTypes.func.isRequired,
  files: PropTypes.arrayOf(PropTypes.object),
  reportId: PropTypes.node.isRequired,
  id: PropTypes.string.isRequired,
};

FileUploader.defaultProps = {
  files: [],
};

export default FileUploader;
