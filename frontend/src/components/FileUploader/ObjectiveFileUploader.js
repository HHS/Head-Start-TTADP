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
import { deleteObjectiveFile, uploadFile } from '../../fetchers/File';
import FileTable from './FileTable';
import Dropzone from './Dropzone';
import './FileUploader.scss';

export const upload = async (file, objectiveId, setErrorMessage) => {
  let res;

  try {
    const data = new FormData();
    data.append('objectiveId', objectiveId);
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

const ObjectiveFileUploader = ({
  onChange, files, objectiveId, id,
}) => {
  const onFileRemoved = async (removedFileIndex) => {
    const file = files[removedFileIndex];
    const remainingFiles = files.filter((f) => f.id !== file.id);
    onChange(remainingFiles);
    await deleteObjectiveFile(file.id, objectiveId);
  };

  const handleDrop = async (e, setErrorMessage) => {
    const newFiles = e.map((file) => upload(file, objectiveId, setErrorMessage));
    Promise.all(newFiles).then((values) => {
      onChange(values);
    });
  };

  return (
    <>
      <Dropzone id={id} handleDrop={handleDrop} />
      <FileTable onFileRemoved={onFileRemoved} files={files} />
    </>
  );
};

ObjectiveFileUploader.propTypes = {
  onChange: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  files: PropTypes.arrayOf(PropTypes.object),
  objectiveId: PropTypes.number.isRequired,
  id: PropTypes.string.isRequired,
};

ObjectiveFileUploader.defaultProps = {
  files: [],
};

export default ObjectiveFileUploader;
