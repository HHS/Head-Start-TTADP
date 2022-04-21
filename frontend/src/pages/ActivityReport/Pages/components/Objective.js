import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import { useController } from 'react-hook-form/dist/index.ie11';
import ObjectiveTitle from '../../../../components/GoalForm/ObjectiveTitle';
import { REPORT_STATUSES } from '../../../../Constants';
import SpecialistRole from './SpecialistRole';
import ObjectiveTopics from '../../../../components/GoalForm/ObjectiveTopics';
import ResourceRepeater from '../../../../components/GoalForm/ResourceRepeater';
import ObjectiveTta from './ObjectiveTta';
import ObjectiveStatus from './ObjectiveStatus';
import ObjectiveSelect from './ObjectiveSelect';
import { OBJECTIVE_PROP } from './constants';
import {
  OBJECTIVE_TITLE,
  OBJECTIVE_ROLE,
  // OBJECTIVE_RESOURCES,
  // OBJECTIVE_TTA,
  OBJECTIVE_ERROR_INDEXES,
  // OBJECTIVE_TOPICS,
} from './goalValidator';
import './Objective.css';

const NO_ERROR = <></>;
const TITLE_ERROR = <span className="usa-error-message">{OBJECTIVE_TITLE}</span>;
const ROLE_ERROR = <span className="usa-error-message">{OBJECTIVE_ROLE}</span>;
// const RESOURCES_ERROR = <span className="usa-error-message">{OBJECTIVE_RESOURCES}</span>;
// const TTA_ERROR = <span className="usa-error-message">{OBJECTIVE_TTA}</span>;
// const TOPICS_ERROR = <span className="usa-error-message">{OBJECTIVE_TOPICS}</span>;

export default function Objective({
  objective,
  topicOptions,
  options,
  errors,
  index,
  remove,
  fieldArrayName,
}) {
  const {
    field: {
      onChange: onChangeTitle,
      onBlur: onBlurTitle,
      value: objectiveTitle,
      name: objectiveTitleInputName,
    },
  } = useController({
    name: `${fieldArrayName}[${index}].title`,
    rules: { required: true },
    defaultValue: objective.title,
  });

  const {
    field: {
      onChange: onChangeTopics,
      onBlur: onBlurTopics,
      value: objectiveTopics,
      name: objectiveTopicsInputName,
    },
  } = useController({
    name: `${fieldArrayName}[${index}].topics`,
    rules: { required: true },
    defaultValue: objective.topics,
  });

  const {
    field: {
      onChange: onChangeResources,
      onBlur: onBlurResources,
      value: objectiveResources,
      name: objectiveResourcesInputName,
    },
  } = useController({
    name: `${fieldArrayName}[${index}].resources`,
    rules: { required: true },
    defaultValue: objective.resources,
  });

  const {
    field: {
      onChange: onChangeRoles,
      onBlur: onBlurRoles,
      value: objectiveRoles,
      name: objectiveRolesInputName,
    },
  } = useController({
    name: `${fieldArrayName}[${index}].roles`,
    rules: { required: true },
    defaultValue: objective.roles,
  });

  const {
    field: {
      onChange: onChangeTta,
      onBlur: onBlurTta,
      value: objectiveTta,
      name: objectiveTtaInputName,
    },
  } = useController({
    name: `${fieldArrayName}[${index}].ttaProvided`,
    rules: { required: true },
    defaultValue: objective.ttaProvided,
  });

  const {
    field: {
      onChange: onChangeStatus,
      onBlur: onBlurStatus,
      value: objectiveStatus,
      name: objectiveStatusInputName,
    },
  } = useController({
    name: `${fieldArrayName}[${index}].status`,
    rules: { required: true },
    defaultValue: objective.status,
  });

  const [titleError, setTitleError] = useState(NO_ERROR);
  const [roleError, setRoleError] = useState(NO_ERROR);
  const [resourcesError] = useState(NO_ERROR);
  const [topicError] = useState(NO_ERROR);
  const [ttaError] = useState(NO_ERROR);

  useEffect(() => {
    if (errors) {
      const objectiveTitleError = errors[OBJECTIVE_ERROR_INDEXES.TITLE] ? TITLE_ERROR : NO_ERROR;
      setTitleError(objectiveTitleError);

      const objectiveRoleError = errors[OBJECTIVE_ERROR_INDEXES.ROLE] ? ROLE_ERROR : NO_ERROR;
      setRoleError(objectiveRoleError);
    }
  }, [errors]);

  const isOnApprovedReport = objective.activityReports && objective.activityReports.some(
    (report) => report.status === REPORT_STATUSES.APPROVED,
  );

  const onChangeObjective = () => {
    // update(index, { ...newObjective });
  };

  let savedTopics = [];
  let savedResources = [];

  if (isOnApprovedReport) {
    savedTopics = objective.topics;
    savedResources = objective.resources;
  }

  const resourcesForRepeater = objectiveResources && objectiveResources.length ? objectiveResources : [{ key: uuidv4(), value: '' }];

  const onRemove = () => remove(index);

  // const validateObjectiveTitle = () => {
  //   let error = NO_ERROR;
  //   if (!objective.title) {
  //     error = TITLE_ERROR;
  //   }
  //   setTitleError(error);
  // };

  // const validateSpecialistRole = () => {
  //   const error = NO_ERROR;

  //   // if (!roles.length) {
  //   //   error = ROLE_ERROR;
  //   // }
  //   setRoleError(error);
  // };

  // const validateObjectiveResources = () => {
  //   let error = NO_ERROR;
  //   if (!objective.resources.length) {
  //     error = RESOURCES_ERROR;
  //   }
  //   setResourcesError(error);
  // };

  // const validateObjectiveTopics = () => {
  //   let error = NO_ERROR;
  //   if (!objective.topics.length) {
  //     error = TOPICS_ERROR;
  //   }
  //   setTopicError(error);
  // };

  // const validateTta = () => {
  //   let error = NO_ERROR;
  //   if (!objective.ttaProvided || objective.ttaProvided === '<p></p>') {
  //     error = TTA_ERROR;
  //   }
  //   setTtaError(error);
  // };

  return (
    <>
      <ObjectiveSelect
        onChange={onChangeObjective}
        selectedObjectives={objective}
        options={options}
        onRemove={onRemove}
      />
      <ObjectiveTitle
        error={titleError}
        isOnApprovedReport={isOnApprovedReport || false}
        title={objectiveTitle}
        onChangeTitle={onChangeTitle}
        validateObjectiveTitle={onBlurTitle}
        status={objective.status}
        inputName={objectiveTitleInputName}
      />
      <SpecialistRole
        isOnApprovedReport={isOnApprovedReport || false}
        error={roleError}
        onChange={onChangeRoles}
        roles={objectiveRoles}
        inputName={objectiveRolesInputName}
        validateSpecialistRole={onBlurRoles}
      />
      <ObjectiveTopics
        error={topicError}
        savedTopics={savedTopics}
        topicOptions={topicOptions}
        validateObjectiveTopics={onBlurTopics}
        topics={isOnApprovedReport ? [] : objectiveTopics}
        onChangeTopics={onChangeTopics}
        inputName={objectiveTopicsInputName}
        status={objective.status}
      />
      <ResourceRepeater
        resources={isOnApprovedReport ? [] : resourcesForRepeater}
        setResources={onChangeResources}
        error={resourcesError}
        validateResources={onBlurResources}
        savedResources={savedResources}
        status={objective.status}
        inputName={objectiveResourcesInputName}
      />
      <ObjectiveTta
        ttaProvided={objectiveTta}
        onChangeTTA={onChangeTta}
        inputName={objectiveTtaInputName}
        status={objective.status}
        isOnApprovedReport={isOnApprovedReport || false}
        error={ttaError}
        validateTta={onBlurTta}
      />
      <ObjectiveStatus
        onBlur={onBlurStatus}
        inputName={objectiveStatusInputName}
        status={objectiveStatus}
        onChangeStatus={onChangeStatus}
      />
    </>
  );
}

Objective.propTypes = {
  index: PropTypes.number.isRequired,
  objective: OBJECTIVE_PROP.isRequired,
  topicOptions: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
  })).isRequired,
  options: PropTypes.arrayOf(
    OBJECTIVE_PROP,
  ).isRequired,
  errors: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.bool])),
  remove: PropTypes.func.isRequired,
  fieldArrayName: PropTypes.string.isRequired,
};

Objective.defaultProps = {
  errors: [],
};
