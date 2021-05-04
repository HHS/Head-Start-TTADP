import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import { Editor } from 'react-draft-wysiwyg';
import {
  Tag, Label, Button, TextInput, Dropdown, Grid,
} from '@trussworks/react-uswds';

import ObjectiveFormItem from './ObjectiveFormItem';
import ContextMenu from '../../../../components/ContextMenu';
import RichEditor from '../../../../components/RichEditor';
import { getEditorState } from '../../../../utils';
import './Objective.css';

const statuses = [
  'Not Started',
  'In Progress',
  'Complete',
];

const EMPTY_TEXT_BOX = '<p></p>';

const Objective = ({
  objectiveAriaLabel,
  objective,
  onRemove,
  onUpdate,
  parentLabel,
}) => {
  const firstInput = useRef();
  const { errors, trigger } = useFormContext();
  const isValid = !errors[parentLabel];

  useEffect(() => {
    if (firstInput.current) {
      firstInput.current.focus();
    }
  }, []);

  const [editableObject, updateEditableObject] = useState(objective);
  const onChange = (e) => {
    updateEditableObject({
      ...editableObject,
      [e.target.name]: e.target.value,
    });
  };

  const { title, ttaProvided, status } = editableObject;
  const defaultShowEdit = !(title && (ttaProvided !== EMPTY_TEXT_BOX) && status);
  const [showEdit, updateShowEdit] = useState(defaultShowEdit);

  const updateEdit = (isEditing) => {
    if (isEditing) {
      updateShowEdit(true);
    } else if (title && ttaProvided !== EMPTY_TEXT_BOX) {
      updateShowEdit(false);
      onUpdate(editableObject);
    } else {
      trigger(parentLabel);
    }

    if (!isValid) {
      trigger(parentLabel);
    }
  };

  const onCancel = () => {
    if (objective.title || objective.ttaProvided !== EMPTY_TEXT_BOX) {
      updateEditableObject(objective);
      updateShowEdit(false);
    } else {
      onRemove();
    }
  };

  const menuItems = [
    {
      label: 'Edit',
      onClick: () => { updateEdit(true); },
    },
    {
      label: 'Delete',
      onClick: onRemove,
    },
  ];

  const contextMenuLabel = `Edit or delete objective ${objectiveAriaLabel}`;

  return (
    <div className="smart-hub--objective">
      {showEdit && (
        <>
          <ObjectiveFormItem
            showErrors={!isValid}
            className="margin-top-0"
            message="Please enter the title for this objective"
            label="Objective"
            value={title}
          >
            <TextInput
              name="title"
              aria-label={`title for objective ${objectiveAriaLabel}`}
              onChange={onChange}
              inputRef={firstInput}
              value={title}
            />
          </ObjectiveFormItem>
          <ObjectiveFormItem
            showErrors={!isValid}
            message="Please enter the TTA provided for this objective"
            label="TTA Provided"
            value={ttaProvided}
          >
            <div className="smart-hub--text-area__resize-vertical">
              <RichEditor
                value={ttaProvided}
                ariaLabel={`TTA provided for objective ${objectiveAriaLabel}`}
                defaultValue={ttaProvided}
                onChange={(content) => {
                  updateEditableObject({
                    ...editableObject,
                    ttaProvided: content,
                  });
                }}
              />
            </div>
          </ObjectiveFormItem>
          <Grid row gap>
            <Grid col={4}>
              <Label>
                Status
                <Dropdown
                  name="status"
                  onChange={onChange}
                  value={status}
                  aria-label={`Status for objective ${objectiveAriaLabel}`}
                >
                  {statuses.map((possibleStatus) => (
                    <option
                      key={possibleStatus}
                      value={possibleStatus}
                    >
                      {possibleStatus}
                    </option>
                  ))}
                </Dropdown>
              </Label>
            </Grid>
            <Grid col={8} className="display-flex flex-align-end">
              <Button aria-label={`Save objective ${objectiveAriaLabel}`} type="button" onClick={() => { updateEdit(false); }}>Save Objective</Button>
              <Button aria-label={`Cancel update of objective ${objectiveAriaLabel}`} secondary type="button" onClick={() => { onCancel(); }}>Cancel</Button>
            </Grid>
          </Grid>
        </>
      )}
      {!showEdit
      && (
        <>
          <div className="display-flex flex-align-end">
            <div className="margin-top-0 margin-left-auto">
              <ContextMenu
                label={contextMenuLabel}
                menuItems={menuItems}
              />
            </div>
          </div>
          <p className="margin-top-0">
            <span className="text-bold">Objective: </span>
            {title}
          </p>
          <p>
            <span className="text-bold">TTA Provided: </span>
            <Editor readOnly toolbarHidden defaultEditorState={getEditorState(ttaProvided)} />
          </p>
          <Tag className="smart-hub--objective-tag">{status}</Tag>
        </>
      )}
    </div>
  );
};

Objective.propTypes = {
  objective: PropTypes.shape({
    title: PropTypes.string,
    ttaProvided: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
  onRemove: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  parentLabel: PropTypes.string.isRequired,
  objectiveAriaLabel: PropTypes.string,
};

Objective.defaultProps = {
  objectiveAriaLabel: '',
};

export default Objective;
