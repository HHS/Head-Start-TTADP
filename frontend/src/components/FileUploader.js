/*
  Uses `react-dropzone` to allow file uploads. Must be placed inside a `react-hook-form`
  form. Selected files display below the main input in a 2 by 2 grid.
*/
// react-dropzone examples all use prop spreading. Disabling the eslint no prop spreading
// rules https://github.com/react-dropzone/react-dropzone
/* eslint-disable react/jsx-props-no-spreading */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useDropzone } from 'react-dropzone';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, Alert } from '@trussworks/react-uswds';
import uploadFile from '../fetchers/File';

import './FileUploader.css';

function Dropzone(props) {
  const { onChange, id, reportId } = props;
  const [errorMessage, setErrorMessage] = useState();
  const onDrop = async (e) => {
    if (props.reportId === 'new') {
      setErrorMessage('Cannot save attachments without a Grantee or Non-Grantee selected');
      return;
    }
    let attachmentType;
    if (id === 'attachments') {
      attachmentType = 'ATTACHMENT';
    } else if (id === 'otherResources') {
      attachmentType = 'RESOURCE';
    }
    const upload = async (file) => {
      try {
        const data = new FormData();
        data.append('reportId', reportId);
        data.append('attachmentType', attachmentType);
        data.append('file', file);
        await uploadFile(data);
      } catch (error) {
        setErrorMessage(`${file.name} failed to upload`);
        // eslint-disable-next-line no-console
        console.log(error);
        return null;
      }
      setErrorMessage(null);
      return {
        key: file.name, originalFileName: file.name, fileSize: file.size, status: 'UPLOADED',
      };
    };
    const newFiles = e.map((file) => upload(file));
    Promise.all(newFiles).then((values) => {
      onChange(values);
    });
  };
  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: 'image/*, .pdf, .docx, .xlsx, .zip' });

  return (
    <div
      {...getRootProps()}
    >
      <input {...getInputProps()} />
      <button type="button" className="usa-button">
        Browse files
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

const FileTable = ({ onFileRemoved, files }) => (
  <div className="files-table--container margin-top-2">
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
        {files.map((file, index) => (
          <tr key={file.key} id={`files-table-row-${index}`}>
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
                role="button"
                className="smart-hub--file-tag-button"
                unstyled
                aria-label="remove file"
                onClick={() => { onFileRemoved(index); }}
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

  const onFileRemoved = (removedFileIndex) => {
    const file = files[removedFileIndex]
    console.log(file)
    onChange(files.filter((f, index) => (index !== removedFileIndex)));
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
