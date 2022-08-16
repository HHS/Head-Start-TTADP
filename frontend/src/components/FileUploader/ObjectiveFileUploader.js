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
import { deleteObjectiveFile } from '../../fetchers/File';
import FileTable from './FileTable';
import Dropzone from './Dropzone';
import './FileUploader.scss';

const ObjectiveFileUploader = ({
  onChange, files, objective, id, upload, index,
}) => {
  const objectiveId = objective.id;

  const onFileRemoved = async (removedFileIndex) => {
    const file = files[removedFileIndex];
    const copyOfFiles = [...files];
    copyOfFiles.splice(removedFileIndex, 1);
    onChange(copyOfFiles);

    if (file.id) {
      await deleteObjectiveFile(file.id, objectiveId);
    }
  };

  const handleDrop = async (e, setErrorMessage) => {
    const newFiles = await Promise.all(
      e.map((file) => upload(file, objective, setErrorMessage, index)),
    );

    let objectives;
    let setObjectives;
    let objectiveIndex;

    const values = newFiles.map((file) => {
      if (!objectives) {
        objectives = file.objectives;
      }

      if (!setObjectives) {
        setObjectives = file.setObjectives;
      }

      if (!objectiveIndex) {
        objectiveIndex = file.index;
      }

      const {
        objectives: a, setObjectives: b, index: c, ...fields
      } = file;

      return fields;
    });

    const copyOfObjectives = objectives.map((o) => ({ ...o }));
    copyOfObjectives[objectiveIndex].files = [...files, ...values];
    setObjectives(copyOfObjectives);
  };

  const config = {
    size: 'size',
    name: 'path',
    id: 'id',
    status: 'status',
  };

  const filesForTable = files.map((file) => {
    const status = 'PENDING';
    const fileId = file.lastModified;
    // console.log({ file, fileId, status });
    return {
      ...file,
      name: file.name,
      size: file.size,
      status: file.status || status,
      id: fileId,
    };
  });

  return (
    <>
      <Dropzone id={id} handleDrop={handleDrop} />
      <FileTable onFileRemoved={onFileRemoved} files={filesForTable} config={config} />
    </>
  );
};

ObjectiveFileUploader.propTypes = {
  onChange: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  files: PropTypes.arrayOf(PropTypes.object),
  objective: PropTypes.shape({
    isNew: PropTypes.bool,
    id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ]),
    title: PropTypes.string,
    topics: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    })),
    files: PropTypes.arrayOf(PropTypes.shape({
      originalFileName: PropTypes.string,
      fileSize: PropTypes.number,
      status: PropTypes.string,
      url: PropTypes.shape({
        url: PropTypes.string,
      }),
    })),
    roles: PropTypes.arrayOf(PropTypes.string),
    activityReports: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number,
    })),
    resources: PropTypes.arrayOf(PropTypes.shape({
      key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      value: PropTypes.string,
    })),
    status: PropTypes.string,
  }).isRequired,
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  upload: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
};

ObjectiveFileUploader.defaultProps = {
  files: [],
};

export default ObjectiveFileUploader;
