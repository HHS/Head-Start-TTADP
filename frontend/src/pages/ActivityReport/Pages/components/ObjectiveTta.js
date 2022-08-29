import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Label } from '@trussworks/react-uswds';
import { Editor } from 'react-draft-wysiwyg';
import Req from '../../../../components/Req';
import RichEditor from '../../../../components/RichEditor';
import { getEditorState } from '../../../../utils';

export default function ObjectiveTta(
  {
    ttaProvided,
    onChangeTTA,
    isOnApprovedReport,
    error,
    validateTta,
    inputName,
  },
) {
  if (isOnApprovedReport) {
    const defaultEditorState = getEditorState(ttaProvided || '');
    return (
      <>
        <p className="usa-prose margin-bottom-0 text-bold">TTA provided</p>
        <Editor
          readOnly
          toolbarHidden
          defaultEditorState={defaultEditorState}
        />
      </>
    );
  }

  return (
    <FormGroup error={error.props.children}>
      <Label className="ttahub-objective-tta" error={error.props.children}>
        TTA provided
        {' '}
        <Req />
        {error}
        <div className="smart-hub--text-area__resize-vertical margin-top-1">
          <input type="hidden" name={inputName} value={ttaProvided} />
          <RichEditor
            ariaLabel="TTA provided for objective"
            defaultValue={ttaProvided}
            value={ttaProvided}
            onChange={onChangeTTA}
            onBlur={validateTta}
          />
        </div>
      </Label>
    </FormGroup>
  );
}

ObjectiveTta.propTypes = {
  ttaProvided: PropTypes.string.isRequired,
  onChangeTTA: PropTypes.func.isRequired,
  isOnApprovedReport: PropTypes.bool.isRequired,
  error: PropTypes.node.isRequired,
  validateTta: PropTypes.func.isRequired,
  inputName: PropTypes.string.isRequired,
};
