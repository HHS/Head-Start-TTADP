/* eslint-disable react/forbid-prop-types */
/*
  Uses `react-dropzone` to allow file uploads. Must be placed inside a `react-hook-form`
  form. Selected files display below the main input in a 2 by 2 grid.
*/
// react-dropzone examples all use prop spreading. Disabling the eslint no prop spreading
// rules https://github.com/react-dropzone/react-dropzone
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { deleteFile } from '../../fetchers/File';
import FileTable from './FileTable';
import Dropzone from './Dropzone';
import './FileUploader.scss';

const FileUploader = ({
  onChange, files, reportId, objectiveId, id,
}) => {
  const onFilesAdded = (newFiles) => {
    onChange([...files, ...newFiles]);
  };

  const onFileRemoved = async (removedFileIndex) => {
    const file = files[removedFileIndex];
    const remainingFiles = files.filter((f) => f.id !== file.id);
    onChange(remainingFiles);
    await deleteFile(file.id, reportId, objectiveId);
  };

  return (
    <>
      <Dropzone id={id} reportId={reportId} objectiveId={objectiveId} onChange={onFilesAdded} />
      <FileTable onFileRemoved={onFileRemoved} files={files} />
    </>
  );
};

FileUploader.propTypes = {
  onChange: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  files: PropTypes.arrayOf(PropTypes.object),
  reportId: PropTypes.node,
  objectiveId: PropTypes.node,
  id: PropTypes.string.isRequired,
};

FileUploader.defaultProps = {
  files: [],
  reportId: null,
  objectiveId: null,

};

export default FileUploader;
