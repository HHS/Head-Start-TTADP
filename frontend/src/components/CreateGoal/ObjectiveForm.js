import React from 'react';
import PropTypes from 'prop-types';

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
  objective,
  setObjective,
}) {
  // the parent objective data from props
  const { text, topics, resources } = objective;

  // onchange handlers
  const onChangeText = (e) => setObjective({ ...objective, text: e.target.value });
  const onChangeTopics = (newTopics) => setObjective({ ...objective, topics: newTopics });
  const setResources = (newResources) => setObjective({ ...objective, resources: newResources });

  // validate different fields
  const validateObjectiveText = () => {
    if (!text) {
      setObjectiveError(index, <>Please enter objective text</>);
    }
  };

  const validateObjectiveTopics = () => {
    if (!topics.length) {
      setObjectiveError(index, <>Please enter objective text</>);
    }
  };
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
          value={topics}
          onChange={onChangeTopics}
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
  setObjective: PropTypes.func.isRequired,
  objective: PropTypes.shape({
    text: PropTypes.string,
    topics: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    })),
    resources: PropTypes.arrayOf(PropTypes.shape({
      key: PropTypes.string,
      value: PropTypes.number,
    })),
  }).isRequired,
};

ObjectiveForm.defaultProps = {
  error: undefined,
};
