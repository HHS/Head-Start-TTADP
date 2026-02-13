import React, { useState, useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import { Label, Radio, Fieldset, FormGroup, ErrorMessage, Alert } from '@trussworks/react-uswds'
import QuestionTooltip from '../QuestionTooltip'
import ObjectiveFileUploader from '../FileUploader/ObjectiveFileUploader'
import './ObjectiveFiles.scss'

export default function ObjectiveFiles({
  objective,
  files,
  onChangeFiles,
  onUploadFiles,
  index,
  inputName,
  onBlur,
  reportId,
  label,
  forceObjectiveSave,
  selectedObjectiveId,
  useFiles: useFilesProp,
  onChangeUseFiles,
}) {
  const objectiveId = objective.id
  const hasFiles = useMemo(() => files && files.length > 0, [files])
  const [useFiles, setUseFiles] = useState(useFilesProp ?? hasFiles)
  const [fileError, setFileError] = useState()
  const hideFileToggle = useMemo(() => hasFiles && files.some((file) => file.onAnyReport), [hasFiles, files])

  useEffect(() => {
    if (!useFiles && hasFiles) {
      setUseFiles(true)
      if (onChangeUseFiles) {
        onChangeUseFiles(true)
      }
    }
  }, [useFiles, hasFiles, onChangeUseFiles])

  useEffect(() => {
    if (useFilesProp !== undefined && useFilesProp !== useFiles) {
      setUseFiles(useFilesProp)
    }
  }, [useFilesProp, useFiles])

  const showSaveDraftInfo = forceObjectiveSave && (!selectedObjectiveId || !(typeof selectedObjectiveId === 'number'))

  return (
    <>
      <Fieldset className="ttahub-objective-files margin-top-3">
        {hideFileToggle ? null : (
          <>
            <legend>
              {label} <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
              <QuestionTooltip
                text={
                  <div>
                    Examples include:{' '}
                    <ul className="usa-list">
                      <li>Presentation slides from PD events</li>
                      <li>PDF&apos;s you created from multiple TTA resources</li>
                      <li>Other OHS-provided resources</li>
                    </ul>
                  </div>
                }
              />
            </legend>
            {showSaveDraftInfo ? (
              <Alert type="info" headingLevel="h4" slim>
                Add a TTA objective and save as draft to upload resources.
              </Alert>
            ) : (
              <>
                <Radio
                  label="Yes"
                  id={`add-objective-files-yes-${objectiveId}-${index}`}
                  name={`add-objective-files-${objectiveId}-${index}`}
                  checked={useFiles}
                  onChange={() => {
                    setUseFiles(true)
                    onChangeUseFiles(true)
                  }}
                />
                <Radio
                  label="No"
                  id={`add-objective-files-no-${objectiveId}-${index}`}
                  name={`add-objective-files-${objectiveId}-${index}`}
                  checked={!useFiles}
                  onChange={() => {
                    setUseFiles(false)
                    onChangeUseFiles(false)
                  }}
                />
              </>
            )}
          </>
        )}
        {useFiles && !showSaveDraftInfo ? (
          <>
            <FormGroup className="ttahub-objective-files-dropzone margin-top-2 margin-bottom-0" error={fileError}>
              <Label htmlFor="files">Attach any non-link resources</Label>
              <span className="usa-hint display-block">Example file types: .docx, .pdf, .ppt (max size 30 MB)</span>
              {fileError && <ErrorMessage className="margin-bottom-1">{fileError}</ErrorMessage>}
              <ObjectiveFileUploader
                files={files}
                onChange={onChangeFiles}
                objective={objective}
                upload={onUploadFiles}
                id={`files-${objectiveId}`}
                index={index}
                onBlur={onBlur}
                inputName={inputName}
                error={fileError}
                setError={setFileError}
                reportId={reportId}
              />
            </FormGroup>
          </>
        ) : null}
      </Fieldset>
    </>
  )
}

ObjectiveFiles.propTypes = {
  label: PropTypes.string,
  objective: PropTypes.shape({
    isNew: PropTypes.bool,
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    topics: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string,
        value: PropTypes.number,
      })
    ),
    files: PropTypes.arrayOf(
      PropTypes.shape({
        originalFileName: PropTypes.string,
        fileSize: PropTypes.number,
        status: PropTypes.string,
        url: PropTypes.shape({
          url: PropTypes.string,
        }),
      })
    ),
    activityReports: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
      })
    ),
    resources: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        value: PropTypes.string,
      })
    ),
    status: PropTypes.string,
  }).isRequired,
  files: PropTypes.arrayOf(
    PropTypes.shape({
      originalFileName: PropTypes.string,
      fileSize: PropTypes.number,
      status: PropTypes.string,
      url: PropTypes.shape({
        url: PropTypes.string,
      }),
    })
  ),
  onChangeFiles: PropTypes.func.isRequired,
  onUploadFiles: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
  inputName: PropTypes.string,
  onBlur: PropTypes.func,
  reportId: PropTypes.number,
  forceObjectiveSave: PropTypes.bool,
  selectedObjectiveId: PropTypes.number,
  useFiles: PropTypes.bool,
  onChangeUseFiles: PropTypes.func,
}

ObjectiveFiles.defaultProps = {
  files: [],
  inputName: '',
  onBlur: () => {},
  reportId: 0,
  forceObjectiveSave: true,
  selectedObjectiveId: undefined,
  label: "Do you plan to use any TTA resources that aren't available as a link?",
  useFiles: undefined,
  onChangeUseFiles: () => {},
}
