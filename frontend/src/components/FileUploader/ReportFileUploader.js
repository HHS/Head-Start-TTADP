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
import { uploadFile } from '../../fetchers/File';
import FileTable from './FileTable';
import Dropzone from './Dropzone';
import './FileUploader.scss';

export const upload = async (file, idKey, idValue, setErrorMessage) => {
  try {
    const data = new FormData();
    data.append(idKey, idValue);
    data.append('file', file);
    const [res] = await uploadFile(data);
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

const ReportFileUploader = ({
  onChange,
  files,
  idKey,
  idValue,
  id,
  setErrorMessage,
  deleteFile,
}) => {
  const onFileRemoved = async (removedFileIndex) => {
    const file = files[removedFileIndex];
    await deleteFile(file.id, idValue);
    const remainingFiles = files.filter((f) => f.id !== file.id);
    onChange(remainingFiles);
  };

  const handleDrop = async (e) => {
    if (idValue === 'new') {
      setErrorMessage('Cannot save attachments without a recipient or other entity selected');
      return;
    }

    const newFiles = e.map((file) => upload(file, idKey, idValue, setErrorMessage));
    const values = await Promise.all(newFiles);
    onChange([...files, ...values.filter((file) => file)]);
  };

  return (
    <>
      <Dropzone inputName={id} handleDrop={handleDrop} setErrorMessage={setErrorMessage} />
      <FileTable
        onFileRemoved={onFileRemoved}
        files={files.map((f) => (
          { ...f, showDelete: true }
        ))}
      />
    </>
  );
};

ReportFileUploader.propTypes = {
  onChange: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  files: PropTypes.arrayOf(PropTypes.object),
  idValue: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]).isRequired,
  idKey: PropTypes.string.isRequired,
  id: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]).isRequired,
  setErrorMessage: PropTypes.func.isRequired,
  deleteFile: PropTypes.func.isRequired,
};

ReportFileUploader.defaultProps = {
  files: [],
};

export default ReportFileUploader;
