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
import { deleteObjectiveFile, deleteFile } from '../../fetchers/File';
import FileTable from './FileTable';
import Dropzone from './Dropzone';
import './FileUploader.scss';

const ObjectiveFileUploader = ({
  onChange, files, objective, id, upload, index, inputName, onBlur, setError,
}) => {
  const onFileRemoved = async (removedFileIndex) => {
    const file = files[removedFileIndex];
    const copyOfFiles = [...files];
    copyOfFiles.splice(removedFileIndex, 1);
    onChange(copyOfFiles);

    if (file.id && file.objectiveIds) {
      await deleteObjectiveFile(file.id, file.objectiveIds);
    } else if (file.id) {
      await deleteFile(file.id);
    }
  };

  const handleDrop = async (e) => {
    const newFiles = await Promise.all(
      e.map((file) => upload(file, objective, setError, index)),
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

    const allFilesIncludingTheNewOnes = [...files, ...values];

    // on the goals and objectives form, we have this extra step to update the objectives
    if (objectives && setObjectives) {
      const copyOfObjectives = objectives.map((o) => ({ ...o }));
      copyOfObjectives[objectiveIndex].files = allFilesIncludingTheNewOnes;
      copyOfObjectives[objectiveIndex].ids = allFilesIncludingTheNewOnes
        .filter((f) => f.objectiveIds)
        .map((f) => f.objectiveIds)
        .flat();
      setObjectives(copyOfObjectives);
    } else {
      // else we just update the files array for local display
      // this method could conceivably lead to orphaned files
      onChange(allFilesIncludingTheNewOnes);
    }
  };

  const filesForTable = files.map((file) => {
    const status = 'PENDING';
    const fileId = file.id || file.lastModified;

    return {
      ...file,
      originalFileName: file.name || file.originalFileName,
      fileSize: file.size || file.fileSize,
      status: file.status || status,
      id: fileId,
    };
  });

  return (
    <>
      <Dropzone
        handleDrop={handleDrop}
        onBlur={onBlur}
        inputName={inputName || id}
        setErrorMessage={setError}
      />
      <FileTable onFileRemoved={onFileRemoved} files={filesForTable} />
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
  inputName: PropTypes.string.isRequired,
  onBlur: PropTypes.func.isRequired,
  setError: PropTypes.func.isRequired,
};

ObjectiveFileUploader.defaultProps = {
  files: [],
};

export default ObjectiveFileUploader;
