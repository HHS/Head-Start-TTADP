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
import { deleteObjectiveFile, deleteFile, removeActivityReportObjectiveFile } from '../../fetchers/File';
import FileTable from './FileTable';
import Dropzone from './Dropzone';
import './FileUploader.scss';

const ObjectiveFileUploader = ({
  onChange,
  files,
  objective,
  id,
  upload,
  index,
  inputName,
  onBlur,
  setError,
  reportId,
}) => {
  const onFileRemoved = async (removedFileIndex) => {
    const file = files[removedFileIndex];
    const fileHasObjectiveFile = file.ObjectiveFile && file.ObjectiveFile.objectiveId;
    const objectiveHasBeenSaved = objective.ids && objective.ids.length && objective.ids.length > 0;
    const uploaderIsOnReport = reportId > 0;

    try {
      if (uploaderIsOnReport) {
        console.log('Delete 1');
        console.log('Delete Info: ', reportId, file.id, objective.ids);
        // remove from activity report objective file only
        await removeActivityReportObjectiveFile(reportId, file.id, objective.ids);
      } else if (objectiveHasBeenSaved) {
        console.log('Delete 2');
        // remove objective file and delete file
        await deleteObjectiveFile(file.id, objective.ids);
      } else if (fileHasObjectiveFile) {
        console.log('Delete 3');
        // remove objective file and delete file
        await deleteObjectiveFile(file.id, [file.ObjectiveFile.objectiveId]);
      } else {
        console.log('Delete 4');
        // remove the file entirely
        await deleteFile(file.id);
      }

      // remove from the UI if the network request was successful
      const copyOfFiles = [...files];
      copyOfFiles.splice(removedFileIndex, 1);
      onChange(copyOfFiles);
    } catch (error) {
      setError('There was an error deleting the file. Please try again.');
    }
  };

  const handleDrop = async (e) => {
    const newFiles = await upload(e, objective, setError, index);

    // this is entirely a concession to the inability to accurately
    // mock the upload function in the tests
    const updatedInfo = newFiles || {};

    const {
      setObjectives,
      objectives,
      index: objectiveIndex,
      objectiveIds,
      ...data
    } = updatedInfo;

    const values = Object.values(data);

    const allFilesIncludingTheNewOnes = [...files, ...values];

    // on the goals and objectives form, we have this extra step to update the objectives
    if (objectives && setObjectives) {
      const copyOfObjectives = objectives.map((o) => ({ ...o }));
      copyOfObjectives[objectiveIndex].files = allFilesIncludingTheNewOnes;
      copyOfObjectives[objectiveIndex].ids = objectiveIds;
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
    const showDelete = !file.onAnyReport;

    return {
      ...file,
      originalFileName: file.name || file.originalFileName,
      fileSize: file.size || file.fileSize,
      status: file.status || status,
      id: fileId,
      showDelete,
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
    ids: PropTypes.arrayOf(PropTypes.number),
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
  reportId: PropTypes.number,
};

ObjectiveFileUploader.defaultProps = {
  files: [],
  reportId: 0,
};

export default ObjectiveFileUploader;
