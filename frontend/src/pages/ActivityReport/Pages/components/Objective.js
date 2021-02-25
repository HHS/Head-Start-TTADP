import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';
import {
  Tag, Label, Button, TextInput, Dropdown, Grid,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

import ObjectiveFormItem from './ObjectiveFormItem';
import ContextMenu from '../../../../components/ContextMenu';
import './Objective.css';

const statuses = [
  'Not Started',
  'In Progress',
  'Complete',
];

const Objective = ({
  goalIndex, objectiveIndex, objective, onRemove, showRemove, onUpdate,
}) => {
  const objectiveAriaLabel = `${objectiveIndex + 1} on goal ${goalIndex + 1}`;
  const { errors, trigger } = useFormContext();
  const isValid = !errors.goals;

  const [editableObject, updateEditableObject] = useState(objective);
  const onChange = (e) => {
    updateEditableObject({
      ...editableObject,
      [e.target.name]: e.target.value,
    });
  };

  const { title, ttaProvided, status } = editableObject;
  const defaultShowEdit = !(title && ttaProvided && status);
  const [showEdit, updateShowEdit] = useState(defaultShowEdit);

  const updateEdit = (isEditing) => {
    onUpdate(editableObject);

    if (isEditing) {
      updateShowEdit(true);
    } else if (title && ttaProvided) {
      updateShowEdit(false);
    } else {
      trigger('goals');
    }

    if (!isValid) {
      trigger('goals');
    }
  };

  const menuItems = [
    {
      label: 'Edit',
      onClick: () => { updateEdit(true); },
    },
  ];

  let contextMenuLabel;

  if (showRemove) {
    contextMenuLabel = `Edit or delete objective ${objectiveAriaLabel}`;
    menuItems.push({
      label: 'Delete',
      onClick: onRemove,
    });
  } else {
    contextMenuLabel = `Edit objective ${objectiveAriaLabel}`;
  }

  return (
    <div className="smart-hub--objective">
      {showEdit && (
        <>
          {showRemove && (
          <div className="display-flex flex-align-end">
            <Button type="button" className="smart-hub--button__no-margin margin-left-auto" onClick={onRemove} unstyled aria-label={`remove objective ${objectiveAriaLabel}`}>
              <FontAwesomeIcon color="black" icon={faTimes} />
            </Button>
          </div>
          )}
          <ObjectiveFormItem
            showErrors={!isValid}
            message="Please enter the title for this objective"
            label="Objective"
            value={title}
          >
            <TextInput
              name="title"
              aria-label={`title for objective ${objectiveAriaLabel}`}
              onChange={onChange}
              value={title}
            />
          </ObjectiveFormItem>
          <ObjectiveFormItem
            showErrors={!isValid}
            message="Please enter the TTA provided for this objective"
            label="TTA Provided"
            value={ttaProvided}
          >
            <TextInput
              name="ttaProvided"
              aria-label={`TTA provided for objective ${objectiveAriaLabel}`}
              onChange={onChange}
              value={ttaProvided}
            />
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
              <Button outline type="button" onClick={() => { updateEdit(false); }}>Save Objective</Button>
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
            {ttaProvided}
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
  objectiveIndex: PropTypes.number.isRequired,
  goalIndex: PropTypes.number.isRequired,
  onRemove: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  showRemove: PropTypes.bool.isRequired,
};

export default Objective;
