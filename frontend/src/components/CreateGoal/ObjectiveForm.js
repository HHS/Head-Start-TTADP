import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

import {
  Alert, Button, Dropdown, FormGroup, Label, Textarea,
} from '@trussworks/react-uswds';
import Select from 'react-select';
import ResourceRepeater from './ResourceRepeater';
import {
  OBJECTIVE_FORM_FIELD_INDEXES, SELECT_STYLES, validateListOfResources, OBJECTIVE_ERROR_MESSAGES,
} from './constants';
import { REPORT_STATUSES } from '../../Constants';

const [
  objectiveTitleError, objectiveTopicsError, objectiveResourcesError, objectiveStatusError,
] = OBJECTIVE_ERROR_MESSAGES;

export default function ObjectiveForm({
  index,
  removeObjective,
  setObjectiveError,
  objective,
  setObjective,
  errors,
  topicOptions,
  goalStatus,
}) {
  // the parent objective data from props
  const {
    id, title, topics, resources, status,
  } = objective;
  const isOnReport = useMemo(() => (
    objective.activityReports && objective.activityReports.length > 0
  ), [objective.activityReports]);

  const isOnApprovedReport = useMemo(() => (
    objective.activityReports && objective.activityReports.some((report) => (
      report.status === REPORT_STATUSES.APPROVED
    ))
  ), [objective.activityReports]);

  // onchange handlers
  const onChangeTitle = (e) => setObjective({ ...objective, title: e.target.value });
  const onChangeTopics = (newTopics) => setObjective({ ...objective, topics: newTopics });
  const setResources = (newResources) => setObjective({ ...objective, resources: newResources });
  const setStatus = (e) => setObjective({ ...objective, status: e.target.value });

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

  const validateStatus = () => {
    let error = <></>;

    if (!status) {
      error = <span className="usa-error-message">{objectiveStatusError}</span>;
    }

    const newErrors = [...errors];
    newErrors.splice(OBJECTIVE_FORM_FIELD_INDEXES.STATUS, 1, error);
    setObjectiveError(index, newErrors);
  };

  return (
    <div className="margin-top-2 ttahub-create-goals-objective-form">
      <div className="display-flex flex-justify maxw-mobile-lg">
        <h3>Objective summary</h3>
        { !isOnReport
          && (<Button type="button" unstyled onClick={() => removeObjective(index)} aria-label={`Remove objective ${index + 1}`}>Remove this objective</Button>)}
      </div>
      { isOnReport
        ? (
          <Alert type="warning" noIcon className="margin-top-0">
            This objective is used on an activity report.
            <br />
            Some fields can&apos;t be edited
          </Alert>
        )
        : null }
      <FormGroup className="margin-top-1" error={errors[OBJECTIVE_FORM_FIELD_INDEXES.TITLE].props.children}>
        <Label htmlFor="objectiveTitle" className={isOnReport ? 'text-bold' : ''}>
          TTA objective
          {' '}
          <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
        </Label>
        { isOnReport && title ? (
          <span>{title}</span>
        ) : (
          <>
            {errors[OBJECTIVE_FORM_FIELD_INDEXES.TITLE]}
            <Textarea id="objectiveTitle" name="objectiveTitle" required value={title} onChange={onChangeTitle} onBlur={validateObjectiveTitle} />
          </>
        )}
      </FormGroup>
      <FormGroup error={errors[OBJECTIVE_FORM_FIELD_INDEXES.TOPICS].props.children}>
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
          closeMenuOnSelect={false}
        />

      </FormGroup>
      { isOnReport ? (
        <span className="margin-bottom-1">{resources.map((resource) => resource.value).join(', ')}</span>
      ) : (
        <ResourceRepeater
          resources={resources}
          setResources={setResources}
          validateResources={validateResources}
          error={errors[OBJECTIVE_FORM_FIELD_INDEXES.RESOURCES]}
          isOnReport={isOnReport}
          isOnApprovedReport={isOnApprovedReport}
        />
      )}

      { goalStatus !== 'Draft' && isOnApprovedReport
        ? (
          <FormGroup>
            <Label htmlFor={`obj-status-${id}`}>Status</Label>
            <Dropdown onBlur={validateStatus} id={`obj-status-${id}`} name={`obj-status-${id}`} onChange={setStatus} value={status}>
              <option>Not started</option>
              <option>In progress</option>
            </Dropdown>
          </FormGroup>
        )
        : null}

    </div>
  );
}

ObjectiveForm.propTypes = {
  index: PropTypes.number.isRequired,
  removeObjective: PropTypes.func.isRequired,
  errors: PropTypes.arrayOf(PropTypes.node).isRequired,
  setObjectiveError: PropTypes.func.isRequired,
  setObjective: PropTypes.func.isRequired,
  goalStatus: PropTypes.string.isRequired,
  objective: PropTypes.shape({
    id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ]),
    title: PropTypes.string,
    topics: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    })),
    activityReports: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number,
    })),
    resources: PropTypes.arrayOf(PropTypes.shape({
      key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      value: PropTypes.string,
    })),
    status: PropTypes.string,
  }).isRequired,
  topicOptions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  })).isRequired,
};
