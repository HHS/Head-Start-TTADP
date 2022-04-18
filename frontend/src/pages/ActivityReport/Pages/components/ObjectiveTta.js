import React from 'react';
import PropTypes from 'prop-types';
import { Label } from '@trussworks/react-uswds';
import { Editor } from 'react-draft-wysiwyg';
import Req from '../../../../components/Req';
import RichEditor from '../../../../components/RichEditor';
import { getEditorState } from '../../../../utils';

export default function ObjectiveTta(
  {
    ttaProvided, onChangeTTA, status, isOnApprovedReport,
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
      <div className="smart-hub--text-area__resize-vertical margin-top-1">
        <RichEditor
          value={ttaProvided}
          ariaLabel="TTA provided for objective"
          defaultValue={ttaProvided}
          onChange={onChangeTTA}
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
};
