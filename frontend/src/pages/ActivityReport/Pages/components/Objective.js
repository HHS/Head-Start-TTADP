import React, { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import { useFormContext, useWatch } from 'react-hook-form/dist/index.ie11';
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
  OBJECTIVE_RESOURCES,
  OBJECTIVE_TTA,
  OBJECTIVE_ERROR_INDEXES,
  OBJECTIVE_TOPICS,
} from './goalValidator';
import './Objective.css';

const NO_ERROR = <></>;
const TITLE_ERROR = <span className="usa-error-message">{OBJECTIVE_TITLE}</span>;
const ROLE_ERROR = <span className="usa-error-message">{OBJECTIVE_ROLE}</span>;
const RESOURCES_ERROR = <span className="usa-error-message">{OBJECTIVE_RESOURCES}</span>;
const TTA_ERROR = <span className="usa-error-message">{OBJECTIVE_TTA}</span>;
const TOPICS_ERROR = <span className="usa-error-message">{OBJECTIVE_TOPICS}</span>;

export default function Objective({
  objective,
  topicOptions,
  selectedObjectives,
  options,
  errors,
  index,
  update,
}) {
  const selectedGoal = useWatch({ name: 'goalForEditing' });
  const objectiveRoles = useWatch({ name: 'objectiveRoles' });

  // no need to recalculate this every time I don't think
  const roles = useMemo(() => (objectiveRoles
    ? objectiveRoles.filter(({ objectiveId }) => objectiveId !== objective.value) : []),
  [objective.value, objectiveRoles]);

  const { setValue } = useFormContext();

  const [titleError, setTitleError] = useState(NO_ERROR);
  const [roleError, setRoleError] = useState(NO_ERROR);
  const [resourcesError, setResourcesError] = useState(NO_ERROR);
  const [topicError, setTopicError] = useState(NO_ERROR);
  const [ttaError, setTtaError] = useState(NO_ERROR);

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

  const onChangeTitle = (title) => {
    update(index, { ...objective, title });
  };

  const onChangeTopics = (topics) => {
    update(index, { ...objective, topics });
  };

  const onChangeStatus = (status) => {
    update(index, { ...objective, status });
  };

  const setResources = (resources) => {
    update(index, { ...objective, resources });
  };

  const onChangeTTA = (ttaProvided) => {
    update(index, { ...objective, ttaProvided });
  };

  const onChangeObjective = (newObjective) => {
    update(index, { ...newObjective });
  };

  let savedTopics = [];
  let savedResources = [];

  if (isOnApprovedReport) {
    savedTopics = objective.topics;
    savedResources = objective.resources;
  }

  const resourcesForRepeater = objective.resources.length ? objective.resources : [{ key: uuidv4(), value: '' }];

  const onRemove = () => {
    const goalToUpdate = { ...selectedGoal };
    const copyOfObjectives = selectedObjectives.map((obj) => ({ ...obj }));
    goalToUpdate.objectives = copyOfObjectives.filter((obj) => obj.id !== objective.id);
    setValue('goalForEditing', goalToUpdate);
  };

  const validateObjectiveTitle = () => {
    let error = NO_ERROR;
    if (!objective.title) {
      error = TITLE_ERROR;
    }
    setTitleError(error);
  };

  const validateSpecialistRole = () => {
    let error = NO_ERROR;

    if (!roles.length) {
      error = ROLE_ERROR;
    }
    setRoleError(error);
  };

  const validateObjectiveResources = () => {
    let error = NO_ERROR;
    if (!objective.resources.length) {
      error = RESOURCES_ERROR;
    }
    setResourcesError(error);
  };

  const validateObjectiveTopics = () => {
    let error = NO_ERROR;
    if (!objective.topics.length) {
      error = TOPICS_ERROR;
    }
    setTopicError(error);
  };

  const validateTta = () => {
    let error = NO_ERROR;
    if (!objective.ttaProvided || objective.ttaProvided === '<p></p>') {
      error = TTA_ERROR;
    }
    setTtaError(error);
  };

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
        title={objective.title}
        onChangeTitle={onChangeTitle}
        validateObjectiveTitle={validateObjectiveTitle}
        status={objective.status}
      />
      <SpecialistRole
        objective={objective}
        error={roleError}
        validateSpecialistRole={validateSpecialistRole}
      />
      <ObjectiveTopics
        error={topicError}
        savedTopics={savedTopics}
        topicOptions={topicOptions}
        validateObjectiveTopics={validateObjectiveTopics}
        topics={isOnApprovedReport ? [] : objective.topics}
        onChangeTopics={onChangeTopics}
        status={objective.status}
      />
      <ResourceRepeater
        resources={isOnApprovedReport ? [] : resourcesForRepeater}
        setResources={setResources}
        error={resourcesError}
        validateResources={validateObjectiveResources}
        savedResources={savedResources}
        status={objective.status}
      />
      <ObjectiveTta
        ttaProvided={objective.ttaProvided}
        onChangeTTA={onChangeTTA}
        status={objective.status}
        isOnApprovedReport={isOnApprovedReport || false}
        error={ttaError}
        validateTta={validateTta}
      />
      <ObjectiveStatus
        status={objective.status}
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
  selectedObjectives: OBJECTIVE_PROP.isRequired,
  options: PropTypes.arrayOf(
    OBJECTIVE_PROP,
  ).isRequired,
  errors: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.bool])),
  update: PropTypes.func.isRequired,
};

Objective.defaultProps = {
  errors: [],
};
