/*
  Uses `react-dropzone` to allow file uploads. Must be placed inside a `react-hook-form`
  form. Selected files display below the main input in a 2 by 2 grid.
*/
// react-dropzone examples all use prop spreading. Disabling the eslint no prop spreading
// rules https://github.com/react-dropzone/react-dropzone
/* eslint-disable react/jsx-props-no-spreading */
import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useDropzone } from 'react-dropzone';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, Alert } from '@trussworks/react-uswds';
import { uploadFile, deleteFile } from '../fetchers/File';
import Modal from './Modal';

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
    setErrorMessage('Cannot save attachments without a Recipient or Other entity selected');
    return;
  }
  const newFiles = e.map((file) => upload(file, reportId, setErrorMessage));
  Promise.all(newFiles).then((values) => {
    onChange(values);
  });
};

export const FileRejections = ({
  fileRejections,
}) => {
  const fileRejectionItems = fileRejections.map(({ file, errors }) => (
    <span key={file.path}>
      <strong>{file.path}</strong>
      {` (${(file.size / 1000000).toFixed(2)} MB)`}
      <span>
        <br />
        <span>This file cannot be uploaded for the following reasons:</span>
        <ul className="margin-0 margin-bottom-1">
          {errors.map((e) => (
            <li key={e.code}>{e.code === 'file-too-large' ? 'File is larger than 30 MB' : e.message}</li>
          ))}
        </ul>
      </span>
    </span>
  ));

  return (
    <div>
      {
        fileRejectionItems
      }
    </div>
  );
};

FileRejections.propTypes = {
  fileRejections: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        errors: PropTypes.arrayOf(
          PropTypes.shape({
            code: PropTypes.string.isRequired,
            message: PropTypes.string.isRequired,
          }),
        ),
      }),
    ),
  ]).isRequired,
};

function Dropzone(props) {
  const { onChange, id, reportId } = props;
  const [errorMessage, setErrorMessage] = useState();
  const onDrop = (e) => handleDrop(e, reportId, id, onChange, setErrorMessage);
  const maxSize = 30000000;

  const {
    fileRejections, getRootProps, getInputProps,
  } = useDropzone({
    onDrop, minSize: 0, maxSize, accept: 'image/*, .pdf, .docx, .xlsx, .pptx, .doc, .xls, .ppt, .zip',
  });

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
            This is an error
          </Alert>
        )}
      {fileRejections.length > 0
        && (
          <Alert className="files-table--upload-alert" type="error" slim noIcon>
            <FileRejections fileRejections={fileRejections} />
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
          { files[index] ? files[index].originalFileName : null }
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
  files: PropTypes.arrayOf(PropTypes.object).isRequired,
};

DeleteFileModal.defaultProps = {
  index: null,
};

const FileTable = ({ onFileRemoved, files }) => {
  const [index, setIndex] = useState(null);
  const modalRef = useRef();
  const handleDelete = (newIndex) => {
    setIndex(newIndex);
    modalRef.current.toggleModal(true);
  };

  return (
    <div className="files-table--container margin-top-2">
      <DeleteFileModal
        modalRef={modalRef}
        onFileRemoved={onFileRemoved}
        files={files}
        index={index}
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
      {files.length === 0 && (
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
