/*
  Uses `react-dropzone` to allow file uploads. Must be placed inside a `react-hook-form`
  form

  This component will likely see style updates, specifically around the list of already
  selected files.
*/
// react-dropzone examples all use prop spreading. Disabling the eslint no prop spreading
// rules https://github.com/react-dropzone/react-dropzone
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { useDropzone } from 'react-dropzone';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

import { Button } from '@trussworks/react-uswds';

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
    width: '31rem',
    height: '8rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: '0.125rem',
    borderColor: '#979797',
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
      <p>
        Drag file here or
        {' '}
        <span style={linkStyle}>choose from folder</span>
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
      <ul>
        {files.map((file, index) => (
          <li key={file.name}>
            {file.name}
            {' '}
            <Button unstyled onClick={() => { onFileRemoved(index); }}><FontAwesomeIcon color="black" icon={faTimes} /></Button>
          </li>
        ))}
      </ul>
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
