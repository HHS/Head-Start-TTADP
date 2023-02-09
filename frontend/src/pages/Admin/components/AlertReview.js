/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
// import { SiteAlert } from '@trussworks/react-uswds';
import draftToHtml from 'draftjs-to-html';
import { Editor } from 'react-draft-wysiwyg';
import { getEditorState } from '../../../utils';

const BASE_EDITOR_HEIGHT = '10rem';

export default function ReviewAlert({ alert }) {
  const [isEditable, setIsEditable] = useState(alert.isNew);

  let defaultEditorState;
  if (alert.message) {
    defaultEditorState = getEditorState(alert.message);
  }

  const onInternalChange = (currentContentState) => {
    const html = draftToHtml(currentContentState);
    console.log(html);
  };

  const onSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className="padding-1">
      <label htmlFor="is-editable">Edit mode</label>
      <input id="is-editable" name="is-editable" type="checkbox" value={isEditable} onChange={() => setIsEditable(!isEditable)} />

      <form onSubmit={onSubmit}>
        <label htmlFor={`alert-${alert.id}-title`}>Title</label>
        <input id={`alert-${alert.id}-title`} type="text" className="usa-input" name="title" defaultValue={alert.title} required />

        <label htmlFor={`alert-${alert.id}-message`}>Message</label>

        <Editor
          onBlur={() => {}}
          spellCheck
          defaultEditorState={defaultEditorState}
          onChange={onInternalChange}
          ariaLabel={`alert ${alert.id} message`}
          handlePastedText={() => false}
          tabIndex="0"
          editorStyle={{ border: '1px solid #565c65', minHeight: BASE_EDITOR_HEIGHT }}
        />

        <label htmlFor={`alert-${alert.id}-start-date`}>Start date</label>
        <input id={`alert-${alert.id}-start-date`} type="date" className="usa-input" name="startDate" defaultValue={alert.startDate} required />

        <label htmlFor={`alert-${alert.id}-end-date`}>End date</label>
        <input id={`alert-${alert.id}-end-date`} type="date" className="usa-input" name="endDate" defaultValue={alert.endDate} required />

        <label htmlFor={`alert-${alert.id}-status`}>Status</label>
        <select id={`alert-${alert.id}-status`} className="usa-select" name="status" defaultValue={alert.status} required>
          <option>Draft</option>
          <option>Published</option>
        </select>
      </form>
    </div>
  );
}

ReviewAlert.propTypes = {
  alert: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    isNew: PropTypes.bool,
  }).isRequired,
};
