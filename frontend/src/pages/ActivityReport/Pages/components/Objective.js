import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useFormContext, Controller } from 'react-hook-form';
import {
  Tag, Label, Button, TextInput, Dropdown, Grid,
} from '@trussworks/react-uswds';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

import ContextMenu from '../../../../components/ContextMenu';
import './Objective.css';

const statuses = [
  'Not Started',
  'In Progress',
  'Complete',
];

const Objective = ({
  objectiveIndex, goalIndex, remove,
}) => {
  const { watch, control } = useFormContext();
  const objectiveAriaLabel = `${objectiveIndex + 1} on goal ${goalIndex + 1}`;

  const objectPath = `goals[${goalIndex}].objectives[${objectiveIndex}]`;
  const {
    title,
    ttaProvided,
    status,
  } = watch(objectPath, {});

  const defaultEdit = !(title && ttaProvided && status);
  const [showEdit, updateShowEdit] = useState(defaultEdit);

  const updateEdit = (isEditing) => {
    if (isEditing || (title && ttaProvided && status)) {
      updateShowEdit(isEditing);
    }
  };

  return (
    <div className="smart-hub--objective">
      {showEdit && (
        <>
          <div className="display-flex flex-align-end">
            <Button type="button" className="smart-hub--button__no-margin margin-left-auto" onClick={() => { remove(objectiveIndex); }} unstyled aria-label={`remove objective ${objectiveAriaLabel}`}>
              <FontAwesomeIcon color="black" icon={faTimes} />
            </Button>
          </div>
          <Controller
            control={control}
            name={`${objectPath}.title`}
            defaultValue={title || ''}
            render={({ value, onChange }) => (
              <Label className="margin-top-0">
                Objective
                <TextInput
                  aria-label={`title for objective ${objectiveAriaLabel}`}
                  onChange={(e) => onChange(e.target.value)}
                  value={value}
                />
              </Label>
            )}
          />
          <Controller
            control={control}
            name={`${objectPath}.ttaProvided`}
            defaultValue={ttaProvided || ''}
            render={({ value, onChange }) => (
              <Label>
                TTA Provided
                <TextInput
                  aria-label={`TTA provided for objective ${objectiveAriaLabel}`}
                  onChange={(e) => onChange(e.target.value)}
                  value={value}
                />
              </Label>
            )}
          />
          <Grid row gap>
            <Grid col={4}>
              <Controller
                control={control}
                name={`${objectPath}.status`}
                defaultValue={status || 'Not Started'}
                render={({ value, onChange }) => (
                  <Label>
                    Status
                    <Dropdown
                      onChange={(e) => { onChange(e.target.value); }}
                      value={value}
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
                )}
              />
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
                label={`Edit or delete objective ${objectiveAriaLabel}`}
                menuItems={[
                  {
                    label: 'Edit',
                    onClick: () => { updateEdit(true); },
                  },
                  {
                    label: 'Delete',
                    onClick: () => { remove(objectiveIndex); },
                  },
                ]}
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
  objectiveIndex: PropTypes.number.isRequired,
  goalIndex: PropTypes.number.isRequired,
  remove: PropTypes.func.isRequired,
};

export default Objective;
