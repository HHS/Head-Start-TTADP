import React from 'react';
import {
  Button, FormGroup, Label, Textarea,
} from '@trussworks/react-uswds';
import Select from 'react-select';
import ResourceRepeater from './ResourceRepeater';
import { SELECT_STYLES } from './constants';
import { TOPICS } from '../../Constants';

export default function ObjectiveForm() {
  return (
    <div>
      <div>
        <h3>Objective summary</h3>
        <Button role="button" unstyled>Remove this objective</Button>
      </div>
      <FormGroup>
        <Label htmlFor="objectiveText">
          Objective
          <span className="smart-hub--form-required font-family-sans font-ui-xs"> (required)</span>
        </Label>
        <span className="usa-hint">
          How TTA will support recipient goal
        </span>
        <Textarea id="objectiveText" name="objectiveText" required value="" />
      </FormGroup>
      <FormGroup>
        <Label htmlFor="objectiveText">
          Topics
          <span className="smart-hub--form-required font-family-sans font-ui-xs"> (required)</span>
        </Label>
        <span className="usa-hint">
          Align with statement of work
        </span>
        <Select
          styles={SELECT_STYLES}
          components={{
            DropdownIndicator: null,
          }}
          className="usa-select"
          isMulti
          options={TOPICS.map((label, value) => ({ value, label }))}
        />
      </FormGroup>
      <ResourceRepeater />
    </div>
  );
}
