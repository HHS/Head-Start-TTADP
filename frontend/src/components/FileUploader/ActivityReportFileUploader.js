/* eslint-disable react/forbid-prop-types */
/*
  Uses `react-dropzone` to allow file uploads. Must be placed inside a `react-hook-form`
  form. Selected files display below the main input in a 2 by 2 grid.
*/
// react-dropzone examples all use prop spreading. Disabling the eslint no prop spreading
// rules https://github.com/react-dropzone/react-dropzone
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import PropTypes from 'prop-types'
import ReportFileUploader from './ReportFileUploader'
import { deleteReportFile } from '../../fetchers/File'

const ActivityReportFileUploader = ({ onChange, files, reportId, id, setErrorMessage }) => (
  <ReportFileUploader
    onChange={onChange}
    files={files}
    idKey="reportId"
    idValue={reportId}
    id={id}
    setErrorMessage={setErrorMessage}
    deleteFile={deleteReportFile}
  />
)

ActivityReportFileUploader.propTypes = {
  onChange: PropTypes.func.isRequired,
  files: PropTypes.arrayOf(PropTypes.shape()),
  reportId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, // JSON parser sometimes gives a string, sometimes a number
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  setErrorMessage: PropTypes.func.isRequired,
}

ActivityReportFileUploader.defaultProps = {
  files: [],
}

export default ActivityReportFileUploader
