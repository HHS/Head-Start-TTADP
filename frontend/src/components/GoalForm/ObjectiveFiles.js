import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Label, Radio, Fieldset, FormGroup, ErrorMessage,
} from '@trussworks/react-uswds';
import QuestionTooltip from './QuestionTooltip';
import './ObjectiveFiles.scss';
import ObjectiveFileUploader from '../FileUploader/ObjectiveFileUploader';

export default function ObjectiveFiles({
  objective,
  files,
  onChangeFiles,
  isOnApprovedReport,
  status,
  isOnReport,
  onUploadFiles,
  index,
  inputName,
  onBlur,
}) {
  const objectiveId = objective.id;
  const hasFiles = files && files.length > 0;
  const [useFiles, setUseFiles] = useState(hasFiles);
  const [fileError, setFileError] = useState();

  const readOnly = isOnApprovedReport || status === 'Complete' || (status === 'Not Started' && isOnReport);

  if (readOnly) {
    if (!hasFiles) {
      return null;
    }

    return (
      <>
        <p className="usa-prose text-bold margin-bottom-1">
          Resource files
        </p>
        <ul className="usa-list usa-list--unstyled">
          {files.map((file) => (<li key={file.originalFileName}>{file.originalFileName}</li>))}
        </ul>
      </>
    );
  }

  return (
    <>
      {
      readOnly && hasFiles
        ? (
          <>
            <p className="usa-prose margin-bottom-0 text-bold">Resources</p>
            <p className="usa-prose margin-top-0">{files.map((f) => f.originalFileName).join(', ')}</p>
          </>
        )
        : (
          <Fieldset className="ttahub-objective-files margin-top-1">
            <legend>
              Do you plan to use any TTA resources that aren&apos;t available as a link?
              {' '}
              <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
              <QuestionTooltip
                text={(
                  <div>
                    Examples include:
                    <ul className="usa-list">
                      <li>Presentation slides from PD events</li>
                      <li>PDF&apos;s you created from multiple tta resources</li>
                      <li>Other OHS-provided resources</li>
                    </ul>
                  </div>
                )}
              />
            </legend>
            <Radio
              label="Yes"
              id={`add-objective-files-yes-${objectiveId}-${index}`}
              name={`add-objective-files-${objectiveId}-${index}`}
              checked={useFiles}
              onChange={() => setUseFiles(true)}
            />
            <Radio
              label="No"
              id={`add-objective-files-no-${objectiveId}-${index}`}
              name={`add-objective-files-${objectiveId}-${index}`}
              checked={!useFiles}
              onChange={() => setUseFiles(false)}
            />
            {
                useFiles
                  ? (
                    <>
                      <FormGroup className="ttahub-objective-files-dropzone margin-top-2 margin-bottom-0" error={fileError}>
                        <Label htmlFor="files">Attach any available non-link resources</Label>
                        <span className="usa-hint display-block margin-top-0 margin-bottom-2">Example file types: .pdf, .ppt (max size 30 MB)</span>
                        {fileError
                      && (
                        <ErrorMessage className="margin-bottom-1">
                          {fileError}
                        </ErrorMessage>
                      )}
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
                        />
                      </FormGroup>
                    </>
                  )
                  : null
        }
          </Fieldset>
        )
}
    </>
  );
}

ObjectiveFiles.propTypes = {
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
  files: PropTypes.arrayOf(PropTypes.shape({
    originalFileName: PropTypes.string,
    fileSize: PropTypes.number,
    status: PropTypes.string,
    url: PropTypes.shape({
      url: PropTypes.string,
    }),
  })),
  onChangeFiles: PropTypes.func.isRequired,
  isOnApprovedReport: PropTypes.bool.isRequired,
  isOnReport: PropTypes.bool.isRequired,
  status: PropTypes.string.isRequired,
  onUploadFiles: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
  inputName: PropTypes.string,
  onBlur: PropTypes.func,
};

ObjectiveFiles.defaultProps = {
  files: [],
  inputName: '',
  onBlur: () => {},
};
