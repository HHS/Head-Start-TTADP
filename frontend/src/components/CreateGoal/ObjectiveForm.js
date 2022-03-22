import React from 'react';
import PropTypes from 'prop-types';

import {
  Button, FormGroup, Label, Textarea,
} from '@trussworks/react-uswds';
import Select from 'react-select';
import ResourceRepeater from './ResourceRepeater';
import {
  OBJECTIVE_FORM_FIELD_INDEXES, SELECT_STYLES, validateListOfResources, OBJECTIVE_ERROR_MESSAGES,
} from './constants';

const [
  objectiveTitleError, objectiveTopicsError, objectiveResourcesError,
] = OBJECTIVE_ERROR_MESSAGES;

export default function ObjectiveForm({
  index,
  removeObjective,
  setObjectiveError,
  objective,
  setObjective,
  errors,
  topicOptions,
}) {
  // the parent objective data from props
  const { title, topics, resources } = objective;

  // onchange handlers
  const onChangeTitle = (e) => setObjective({ ...objective, title: e.target.value });
  const onChangeTopics = (newTopics) => setObjective({ ...objective, topics: newTopics });
  const setResources = (newResources) => setObjective({ ...objective, resources: newResources });

  // validate different fields
  const validateObjectiveTitle = () => {
    if (!title) {
      const newErrors = [...errors];
      newErrors.splice(OBJECTIVE_FORM_FIELD_INDEXES.TITLE, 1, <span className="usa-error-message">{objectiveTitleError}</span>);
      setObjectiveError(index, newErrors);
    } else {
      const newErrors = [...errors];
      newErrors.splice(OBJECTIVE_FORM_FIELD_INDEXES.TITLE, 1, <></>);
      setObjectiveError(index, newErrors);
    }
  };

  const validateObjectiveTopics = () => {
    if (!topics.length) {
      const newErrors = [...errors];
      newErrors.splice(OBJECTIVE_FORM_FIELD_INDEXES.TOPICS, 1, <span className="usa-error-message">{objectiveTopicsError}</span>);
      setObjectiveError(index, newErrors);
    } else {
      const newErrors = [...errors];
      newErrors.splice(OBJECTIVE_FORM_FIELD_INDEXES.TOPICS, 1, <></>);
      setObjectiveError(index, newErrors);
    }
  };
  const validateResources = () => {
    let error = <></>;

    const validated = validateListOfResources(resources);

    if (!validated) {
      error = <span className="usa-error-message">{objectiveResourcesError}</span>;
    }

    const newErrors = [...errors];
    newErrors.splice(OBJECTIVE_FORM_FIELD_INDEXES.RESOURCES, 1, error);
    setObjectiveError(index, newErrors);
  };

  return (
    <div className="margin-top-2">
      <div className="display-flex flex-justify maxw-mobile-lg">
        <h3>Objective summary</h3>
        <Button type="button" unstyled onClick={() => removeObjective(index)} aria-label={`Remove objective ${index + 1}`}>Remove this objective</Button>
      </div>
      <FormGroup className="margin-top-1">
        <Label htmlFor="objectiveTitle">
          TTA objective
          {' '}
          <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
        </Label>
        {errors[OBJECTIVE_FORM_FIELD_INDEXES.TITLE]}
        <Textarea id="objectiveTitle" name="objectiveTitle" required value={title} onChange={onChangeTitle} onBlur={validateObjectiveTitle} />
      </FormGroup>
      <FormGroup>
        <Label htmlFor="topics">
          Topics
          {' '}
          <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
        </Label>
        {errors[OBJECTIVE_FORM_FIELD_INDEXES.TOPICS]}
        <Select
          inputId="topics"
          styles={SELECT_STYLES}
          components={{
            DropdownIndicator: null,
          }}
          className="usa-select"
          isMulti
          options={topicOptions}
          onBlur={validateObjectiveTopics}
          value={topics}
          onChange={onChangeTopics}
        />
      </FormGroup>
      <ResourceRepeater
        resources={resources}
        setResources={setResources}
        validateResources={validateResources}
        error={errors[OBJECTIVE_FORM_FIELD_INDEXES.RESOURCES]}
      />
    </div>
  );
}

ObjectiveForm.propTypes = {
  index: PropTypes.number.isRequired,
  removeObjective: PropTypes.func.isRequired,
  errors: PropTypes.arrayOf(PropTypes.node).isRequired,
  setObjectiveError: PropTypes.func.isRequired,
  setObjective: PropTypes.func.isRequired,
  objective: PropTypes.shape({
    title: PropTypes.string,
    topics: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    })),
    resources: PropTypes.arrayOf(PropTypes.shape({
      key: PropTypes.string,
      value: PropTypes.string,
    })),
  }).isRequired,
  topicOptions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  })).isRequired,
};
