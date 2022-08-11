import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Label, Radio, Fieldset,
} from '@trussworks/react-uswds';
import QuestionTooltip from './QuestionTooltip';
import './ObjectiveFiles.scss';
import ObjectiveFileUploader from '../FileUploader/ObjectiveFileUploader';

export default function ObjectiveFiles({
  objectiveId,
  files,
  onChangeFiles,
  isOnApprovedReport,
  status,
  isOnReport,
}) {
  const hasFiles = files && files.length > 0;
  const [useFiles, setUseFiles] = useState(hasFiles);
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
              id="add-objective-files-yes"
              key="add-objective-files-yes"
              name="lock-add-objective-files"
              checked={useFiles}
              onChange={() => setUseFiles(true)}
            />
            <Radio
              label="No"
              id="add-objective-files-no"
              key="add-objective-files-no"
              name="lock-add-objective-files"
              checked={!useFiles}
              onChange={() => setUseFiles(false)}
            />
            {
                useFiles
                  ? (
                    <>
                      <div className="margin-top-2 margin-bottom-1">
                        <Label htmlFor="files">Attach any available non-link resources</Label>
                        <span>Example file types: .pdf, .ppt (max size 30 MB)</span>
                      </div>
                      <ObjectiveFileUploader files={files} onChange={onChangeFiles} objectiveId={objectiveId} id="files" />
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
  objectiveId: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]).isRequired,
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
};

ObjectiveFiles.defaultProps = {
  files: [],
};
