/* eslint-disable react/forbid-prop-types */
/*
  Uses `react-dropzone` to allow file uploads. Must be placed inside a `react-hook-form`
  form. Selected files display below the main input in a 2 by 2 grid.
*/
// react-dropzone examples all use prop spreading. Disabling the eslint no prop spreading
// rules https://github.com/react-dropzone/react-dropzone
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import PropTypes from 'prop-types';

const FileRejections = ({
  fileRejections,
}) => {
  const fileRejectionItems = fileRejections.map(({ file, errors }) => (
    <span key={uuidv4()}>
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
      { fileRejectionItems }
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

export default FileRejections;
