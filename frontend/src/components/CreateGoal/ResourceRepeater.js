import React, { useState } from 'react';
import {
  FormGroup, Label, TextInput, Button,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import PlusButton from './PlusButton';

export default function ResourceRepeater() {
  const [resources, setResources] = useState(['']);

  const addResource = () => {
    const newResources = [...resources, ''];
    setResources(newResources);
  };

  const removeResource = (i) => {
    const newResources = [...resources];
    newResources.splice(i, 1);
    setResources(newResources);
  };

  return (
    <FormGroup>
      <Label htmlFor="objectiveText">
        Resource link
        <span className="smart-hub--form-required font-family-sans font-ui-xs"> (required)</span>
      </Label>
      <span className="usa-hint">
        Enter a valid link used for this objective
      </span>
      { resources.map((r, i) => (
        <div key={r} className="display-flex">
          <TextInput type="url" placeholder="https://" />
          { i > 0 ? (
            <Button unstyled type="button" onClick={() => removeResource(i)}>
              <FontAwesomeIcon className="margin-x-1" color="#005ea2" icon={faTrash} />
            </Button>
          ) : null}
        </div>
      ))}

      <div className="margin-top-2 margin-bottom-4">
        <PlusButton text="Add new resource" onClick={addResource} />
      </div>
    </FormGroup>
  );
}
