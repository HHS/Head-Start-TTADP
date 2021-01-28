/*
  Uses `react-dropzone` to allow file uploads. Must be placed inside a `react-hook-form`
  form. Selected files display below the main input in a 2 by 2 grid.
*/
// react-dropzone examples all use prop spreading. Disabling the eslint no prop spreading
// rules https://github.com/react-dropzone/react-dropzone
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { useDropzone } from 'react-dropzone';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { Tag, Button, Grid } from '@trussworks/react-uswds';

import './FileUploader.css';

function Dropzone(props) {
  const { onChange } = props;
  const onDrop = (e) => {
    console.log(e)
    onChange(e);
  };
  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  // I tried moving these styles to a css file and applying a class to the container
  // and span. The styles were not being applied, it seems like the Dropzone library
  // is messing with the styles somewhere
  const containerStyle = {
    maxWidth: '21rem',
    height: '8rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: '0.125rem',
    borderColor: '#979797',
  };

  const textStyle = {
    textAlign: 'left',
    fontSize: '1.25rem',
    backgroundColor: "#0166AB",
    color: "white", 
    padding: ".5rem",
    borderRadius: "5px",
  };


  return (
    <div
      {...getRootProps()}
    >
      <input {...getInputProps()} />
      <button className="usa-button">
        Browse files
      </button>
    </div>
  );
}

Dropzone.propTypes = {
  onChange: PropTypes.func.isRequired,
};

const FileTable = ({onFileRemoved, files}) => {
  let msg 
  if (files.length === 0) {
    msg = (
      <p className="files-table--empty">No files uploaded</p>
    )
  }
  return (
    <div className="files-table--container margin-top-2">
      <table row gap className="files-table">
        <thead className="files-table--thead" bgcolor="#F8F8F8">
        <th width="50%">
          Name
        </th>
        <th width="20%">
          Size
        </th>
        <th width="20%">
          Status
        </th>
        <th width="10%">
        </th>
        </thead>
        <tbody>
        {files.map((file, index) => (
        <tr>
            <td className="files-table--file-name">
              {file.name}
            </td>
            <td>
              {`${(file.size / 1000).toFixed(1) } KB`}
            </td>
            <td>
              Uploaded
            </td>
          <td>
              <Button
                role="button"
                className="smart-hub--file-tag-button"
                unstyled
                aria-label="remove file"
                onClick={() => { onFileRemoved(index); }}
              >
                <span className="fa-stack fa-sm">
                  <FontAwesomeIcon className="fa-stack-1x" color="black" icon={faTrash} />
                </span>
              </Button>
          </td>

          </tr>

        ))}
        </tbody>
      </table>
      { msg }
    </div>
  );
}
const FileUploader = ({ onChange, files }) => {
  const onFilesAdded = (newFiles) => {
    onChange([...files, ...newFiles]);
  };

  const onFileRemoved = (removedFileIndex) => {
    onChange(files.filter((f, index) => (index !== removedFileIndex)));
  };

  return (
    <>
      <Dropzone onChange={onFilesAdded} />
      <FileTable onFileRemoved={onFileRemoved} files={files} />
        
    </>
  );
};

FileUploader.propTypes = {
  onChange: PropTypes.func.isRequired,
  files: PropTypes.arrayOf(PropTypes.instanceOf(File)),
};

FileUploader.defaultProps = {
  files: [],
};

export default FileUploader;
