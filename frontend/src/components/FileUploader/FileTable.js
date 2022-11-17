import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@trussworks/react-uswds';
import DeleteFileModal from './DeleteFileModal';
import colors from '../../colors';

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
    case 'PENDING':
      return 'Pending';
    case 'SCANNING_FAILED':
      return 'Uploaded';
    default:
      break;
  }
  return 'Upload Failed';
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
                {file.showDelete
                  ? (
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
                        <FontAwesomeIcon color={colors.textInk} icon={faTrash} />
                      </span>
                    </Button>
                  )
                  : null }
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
  // eslint-disable-next-line react/forbid-prop-types
  files: PropTypes.arrayOf(PropTypes.object),
};
FileTable.defaultProps = {
  files: [],

};

export default FileTable;
