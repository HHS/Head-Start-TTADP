import React from 'react';
import PropTypes from 'prop-types';
import { Label } from '@trussworks/react-uswds';
import { Editor } from 'react-draft-wysiwyg';
import Req from '../../../../components/Req';
import RichEditor from '../../../../components/RichEditor';
import { getEditorState } from '../../../../utils';

export default function ObjectiveTta(
  {
    ttaProvided,
    onChangeTTA,
    status,
    isOnApprovedReport,
    error,
    validateTta,
    inputName,
  },
) {
  if (status === 'Complete' || isOnApprovedReport) {
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
    <Label>
      TTA provided
      {' '}
      <Req />
      {error}
      <div className="smart-hub--text-area__resize-vertical margin-top-1">
        <input type="hidden" name={inputName} value={ttaProvided} />
        <RichEditor
          value={ttaProvided}
          ariaLabel="TTA provided for objective"
          defaultValue={ttaProvided}
          onChange={onChangeTTA}
          onBlur={validateTta}
        />
      </div>
    </Label>
  );
}

ObjectiveTta.propTypes = {
  ttaProvided: PropTypes.string.isRequired,
  onChangeTTA: PropTypes.func.isRequired,
  status: PropTypes.string.isRequired,
  isOnApprovedReport: PropTypes.bool.isRequired,
  error: PropTypes.node.isRequired,
  validateTta: PropTypes.func.isRequired,
  inputName: PropTypes.string.isRequired,
};
