import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import {
  Button, FormGroup, Label, Textarea,
} from '@trussworks/react-uswds';
import Select from 'react-select';
import ResourceRepeater from './ResourceRepeater';
import { SELECT_STYLES } from './constants';
import { TOPICS } from '../../Constants';

export default function ObjectiveForm({
  index,
  removeObjective,
  setObjectiveError,
  error,
}) {
  const [text, setText] = useState('');
  const [resources, setResources] = useState([{ key: uuidv4(), value: '' }]);

  // onchange handlers
  const onChangeText = (e) => setText(e.target.value);

  // validate different fields
  const validateObjectiveText = () => {
    if (!text) {
      setObjectiveError(index, <>Please enter objective text</>);
    }
  };
  const validateObjectiveTopics = () => {};
  const validateResources = () => {

  };

  return (
    <div className="margin-top-2">
      <div className="display-flex flex-justify maxw-mobile-lg">
        <h3>Objective summary</h3>
        <Button type="button" unstyled onClick={() => removeObjective(index)}>Remove this objective</Button>
      </div>
      {error}
      <FormGroup className="margin-top-1">
        <Label htmlFor="objectiveText">
          Objective
          <span className="smart-hub--form-required font-family-sans font-ui-xs"> (required)</span>
        </Label>
        <span className="usa-hint">
          How TTA will support recipient goal
        </span>
        <Textarea id="objectiveText" name="objectiveText" required value={text} onChange={onChangeText} onBlur={validateObjectiveText} />
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
          onBlur={validateObjectiveTopics}
        />
      </FormGroup>
      <ResourceRepeater
        resources={resources}
        setResources={setResources}
        validateResources={validateResources}
      />
    </div>
  );
}

ObjectiveForm.propTypes = {
  index: PropTypes.number.isRequired,
  removeObjective: PropTypes.func.isRequired,
  error: PropTypes.node,
  setObjectiveError: PropTypes.func.isRequired,
};

ObjectiveForm.defaultProps = {
  error: undefined,
};
