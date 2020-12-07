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
import { faTimes, faCircle } from '@fortawesome/free-solid-svg-icons';
import { Tag, Button, Grid } from '@trussworks/react-uswds';

import './FileUploader.css';

function Dropzone(props) {
  const { onChange } = props;
  const onDrop = (e) => {
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
    textAlign: 'center',
    fontSize: '16px',
  };

  const linkStyle = {
    cursor: 'pointer',
    color: 'blue',
    textDecoration: 'underline',
  };

  return (
    <div
      {...getRootProps()}
      style={containerStyle}
    >
      <input {...getInputProps()} />
      <p style={textStyle}>
        <b>Drag and drop your files here</b>
        {' '}
        <br />
        or
        <br />
        <span style={linkStyle}>Browse files</span>
      </p>
    </div>
  );
}

Dropzone.propTypes = {
  onChange: PropTypes.func.isRequired,
};

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
      <Grid row gap className="margin-top-2">
        {files.map((file, index) => (
          <Grid key={file.name} col={6} className="margin-top-1">
            <Tag className="smart-hub--file-tag">
              <div className="smart-hub--file-tag-text">
                {file.name}
              </div>
              <Button
                role="button"
                className="smart-hub--file-tag-button"
                unstyled
                aria-label="remove file"
                onClick={() => { onFileRemoved(index); }}
              >
                <span className="fa-stack fa-sm">
                  <FontAwesomeIcon className="fa-stack-1x" color="white" icon={faCircle} />
                  <FontAwesomeIcon className="fa-stack-1x" color="black" icon={faTimes} />
                </span>
              </Button>
            </Tag>
          </Grid>
        ))}
      </Grid>
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
