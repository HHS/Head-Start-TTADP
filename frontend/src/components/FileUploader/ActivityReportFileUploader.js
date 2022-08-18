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
import { deleteReportFile, uploadFile } from '../../fetchers/File';
import FileTable from './FileTable';
import Dropzone from './Dropzone';

import './FileUploader.scss';

export const upload = async (file, reportId, setErrorMessage) => {
  let res;

  try {
    const data = new FormData();
    data.append('reportId', reportId);
    data.append('file', file);
    res = await uploadFile(data);
    setErrorMessage(null);
    return {
      id: res.id, originalFileName: file.name, fileSize: file.size, status: 'UPLOADED', url: res.url,
    };
  } catch (error) {
    setErrorMessage(`${file.name} failed to upload`);
    // eslint-disable-next-line no-console
    console.log(error);
    return null;
  }
};

const ActivityReportFileUploader = ({
  onChange, files, reportId, id, setErrorMessage,
}) => {
  const onFileRemoved = async (removedFileIndex) => {
    const file = files[removedFileIndex];
    const remainingFiles = files.filter((f) => f.id !== file.id);
    onChange(remainingFiles);
    await deleteReportFile(file.id, reportId);
  };

  const handleDrop = async (e) => {
    if (reportId === 'new') {
      setErrorMessage('Cannot save attachments without a recipient or other entity selected');
      return;
    }

    const newFiles = e.map((file) => upload(file, reportId, setErrorMessage));
    Promise.all(newFiles).then((values) => {
      onChange(values.filter((file) => file));
    });
  };

  return (
    <>
      <Dropzone inputName={id} handleDrop={handleDrop} />
      <FileTable onFileRemoved={onFileRemoved} files={files} />
    </>
  );
};

ActivityReportFileUploader.propTypes = {
  onChange: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  files: PropTypes.arrayOf(PropTypes.object),
  reportId: PropTypes.number.isRequired,
  id: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]).isRequired,
  setErrorMessage: PropTypes.func.isRequired,
};

ActivityReportFileUploader.defaultProps = {
  files: [],
};

export default ActivityReportFileUploader;
