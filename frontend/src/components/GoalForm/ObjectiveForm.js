import React, { useMemo, useContext } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import ObjectiveTitle from './ObjectiveTitle';
import ObjectiveTopics from './ObjectiveTopics';
import ResourceRepeater from './ResourceRepeater';
import ObjectiveFiles from './ObjectiveFiles';
import {
  OBJECTIVE_FORM_FIELD_INDEXES, validateListOfResources, OBJECTIVE_ERROR_MESSAGES,
} from './constants';
import { REPORT_STATUSES } from '../../Constants';
import SpecialistRole from './SpecialistRole';
import ObjectiveStatus from './ObjectiveStatus';
import GoalFormLoadingContext from '../../GoalFormLoadingContext';

const [
  objectiveTitleError,
  objectiveTopicsError,
  objectiveResourcesError,
  objectiveRoleError,
] = OBJECTIVE_ERROR_MESSAGES;

export default function ObjectiveForm({
  index,
  removeObjective,
  setObjectiveError,
  objective,
  setObjective,
  errors,
  topicOptions,
  onUploadFile,
  goalStatus,
}) {
  // the parent objective data from props
  const {
    title, topics, resources, status, roles, files,
  } = objective;
  const isOnReport = useMemo(() => (
    objective.activityReports && objective.activityReports.length > 0
  ), [objective.activityReports]);

  const isOnApprovedReport = useMemo(() => (
    (objective.activityReports && objective.activityReports.some((report) => (
      report.status === REPORT_STATUSES.APPROVED
    )))
  ), [objective.activityReports]);

  const { isLoading } = useContext(GoalFormLoadingContext);

  // onchange handlers
  const onChangeTitle = (e) => setObjective({ ...objective, title: e.target.value });
  const onChangeTopics = (newTopics) => setObjective({ ...objective, topics: newTopics });
  const setResources = (newResources) => setObjective({ ...objective, resources: newResources });
  const onChangeFiles = (e) => {
    setObjective({ ...objective, files: e });
  };
  const onChangeRole = (newRole) => setObjective({ ...objective, roles: newRole });
  const onChangeStatus = (newStatus) => setObjective({ ...objective, status: newStatus });

  const availableSpecialistRoles = ['Grantee Specialist', 'Health Specialist', 'Family Engagement Specialist', 'Early Childhood Specialist', 'Systems Specialist'];

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
  const validateSpecialistRole = () => {
    if (!roles.length) {
      const newErrors = [...errors];
      newErrors.splice(OBJECTIVE_FORM_FIELD_INDEXES.ROLE, 1, <span className="usa-error-message">{objectiveRoleError}</span>);
      setObjectiveError(index, newErrors);
    } else {
      const newErrors = [...errors];
      newErrors.splice(OBJECTIVE_FORM_FIELD_INDEXES.ROLE, 1, <></>);
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
    <div className="margin-top-5 ttahub-create-goals-objective-form">
      <div className="display-flex flex-justify maxw-mobile-lg">
        <h3>Objective summary</h3>
        { !isOnReport
          && (<Button type="button" unstyled onClick={() => removeObjective(index)} aria-label={`Remove objective ${index + 1}`}>Remove this objective</Button>)}
      </div>

      <ObjectiveTitle
        error={errors[OBJECTIVE_FORM_FIELD_INDEXES.TITLE]}
        isOnApprovedReport={isOnApprovedReport || false}
        isOnReport={isOnReport || false}
        title={title}
        onChangeTitle={onChangeTitle}
        validateObjectiveTitle={validateObjectiveTitle}
        status={status}
        isLoading={isLoading}
      />

      <SpecialistRole
        error={errors[OBJECTIVE_FORM_FIELD_INDEXES.ROLE]}
        onChange={onChangeRole}
        selectedRoles={roles || []}
        validateSpecialistRole={validateSpecialistRole}
        options={availableSpecialistRoles}
        isOnReport={isOnReport || false}
        isOnApprovedReport={isOnApprovedReport || false}
        status={status}
        isLoading={isLoading}
      />

      <ObjectiveTopics
        error={errors[OBJECTIVE_FORM_FIELD_INDEXES.TOPICS]}
        topicOptions={topicOptions}
        validateObjectiveTopics={validateObjectiveTopics}
        topics={topics}
        onChangeTopics={onChangeTopics}
        status={status}
        isOnReport={isOnReport || false}
        isOnApprovedReport={isOnApprovedReport || false}
        isLoading={isLoading}
      />

      <ResourceRepeater
        resources={resources}
        setResources={setResources}
        validateResources={validateResources}
        error={errors[OBJECTIVE_FORM_FIELD_INDEXES.RESOURCES]}
        isOnReport={isOnReport || false}
        isOnApprovedReport={isOnApprovedReport || false}
        status={status}
        isLoading={isLoading}
      />

      <ObjectiveStatus
        status={status}
        isOnApprovedReport={isOnApprovedReport}
        isOnReport={isOnReport || false}
        goalStatus={goalStatus}
        onChangeStatus={onChangeStatus}
        inputName={`objective-status-${index}`}
        isLoading={isLoading}
      />

      { title && (
        <ObjectiveFiles
          files={files}
          onChangeFiles={onChangeFiles}
          objective={objective}
          isOnApprovedReport={isOnApprovedReport || false}
          isOnReport={isOnReport || false}
          status={status}
          isLoading={isLoading}
          onUploadFile={onUploadFile}
        />
      )}

    </div>
  );
}

ObjectiveForm.propTypes = {
  goalStatus: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  removeObjective: PropTypes.func.isRequired,
  errors: PropTypes.arrayOf(PropTypes.node).isRequired,
  setObjectiveError: PropTypes.func.isRequired,
  setObjective: PropTypes.func.isRequired,
  objective: PropTypes.shape({
    isNew: PropTypes.bool,
    id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ]),
    title: PropTypes.string,
    topics: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    })),
    files: PropTypes.arrayOf(PropTypes.shape({
      originalFileName: PropTypes.string,
      fileSize: PropTypes.number,
      status: PropTypes.string,
      url: PropTypes.shape({
        url: PropTypes.string,
      }),
    })),
    roles: PropTypes.arrayOf(PropTypes.string),
    activityReports: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number,
    })),
    resources: PropTypes.arrayOf(PropTypes.shape({
      key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      value: PropTypes.string,
    })),
    status: PropTypes.string,
  }),
  topicOptions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  })).isRequired,
  onUploadFile: PropTypes.func.isRequired,
};

ObjectiveForm.defaultProps = {
  objective: {
    id: '',
    title: '',
    topics: [],
    activityReports: [],
    resources: [],
    files: [],
    status: '',
  },
};
