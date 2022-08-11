/* eslint-disable react/forbid-prop-types */
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
import { Alert, ErrorMessage } from '@trussworks/react-uswds';
import { handleDrop } from './constants';
import FileRejections from './FileRejections';

export default function Dropzone(props) {
  const {
    onChange, id, reportId, objectiveId,
  } = props;
  const [errorMessage, setErrorMessage] = useState();
  const onDrop = (e) => handleDrop(e, reportId, objectiveId, id, onChange, setErrorMessage);
  const maxSize = 30000000;
  const minSize = 1; // at least 1 byte

  const {
    fileRejections, getRootProps, getInputProps,
  } = useDropzone({
    onDrop, minSize, maxSize, accept: 'image/*, .pdf, .docx, .xlsx, .pptx, .doc, .xls, .ppt, .zip, .txt, .csv',
  });

  const rootProps = getRootProps();

  const { role, tabIndex, ...rootPropsNoRole } = rootProps;

  return (
    <div
      {...rootPropsNoRole}
    >
      <input {...getInputProps()} />
      <button type="button" className="usa-button usa-button--outline">
        Select and upload
      </button>
      {errorMessage
          && (
            <ErrorMessage className="margin-bottom-1">
              {errorMessage}
            </ErrorMessage>
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
  reportId: PropTypes.node,
  objectiveId: PropTypes.node,
  id: PropTypes.string.isRequired,
};

Dropzone.defaultProps = {
  reportId: null,
  objectiveId: null,

};
