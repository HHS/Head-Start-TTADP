import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Label, Radio,
} from '@trussworks/react-uswds';
import FileUploader from '../FileUploader';
import QuestionTooltip from './QuestionTooltip';
import './ObjectiveFiles.scss';

export default function ObjectiveFiles({ objectiveId, files, onChangeFiles }) {
  const [useFiles, setUseFiles] = useState(files && files.length > 0);

  return (
    <FormGroup className="margin-top-1">
      <Label>
        Do you plan to use any TTA resources that aren&apos;t available as a link?
        {' '}
        <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
        <QuestionTooltip
          text={(
            <div className="ttahub-objective-files-tool-tip ">
              Examples include:
              <ul className="usa-list">
                <li>Presentation slides from PD events</li>
                <li>PDF&apos;s you created from multiple tta resources</li>
                <li>Other OHS-provided resources</li>
              </ul>
            </div>
)}
        />
      </Label>
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
                      <FileUploader files={files} onChange={onChangeFiles} objectiveId={objectiveId} id="files" />
                    </>
                  )
                  : null
        }
    </FormGroup>
  );
}

ObjectiveFiles.propTypes = {
  objectiveId: PropTypes.number.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  files: PropTypes.arrayOf(PropTypes.object),
  onChangeFiles: PropTypes.func.isRequired,
};

ObjectiveFiles.defaultProps = {
  files: [],
};
