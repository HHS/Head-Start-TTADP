import React, { useMemo, useContext, useRef } from 'react';
import PropTypes from 'prop-types';
import { REPORT_STATUSES } from '@ttahub/common';
import { Button } from '@trussworks/react-uswds';
import ObjectiveTitle from './ObjectiveTitle';
import ObjectiveTopics from './ObjectiveTopics';
import ResourceRepeater from './ResourceRepeater';
import ObjectiveFiles from './ObjectiveFiles';
import {
  OBJECTIVE_FORM_FIELD_INDEXES,
  validateListOfResources,
  OBJECTIVE_ERROR_MESSAGES,
} from './constants';

import ObjectiveStatus from './ObjectiveStatus';
import AppLoadingContext from '../../AppLoadingContext';
import ObjectiveSuspendModal from '../ObjectiveSuspendModal';
import ObjectiveStatusSuspendReason from '../ObjectiveStatusSuspendReason';
import ObjectiveSupportType from '../ObjectiveSupportType';

const [
  objectiveTitleError,
  objectiveTopicsError,
  objectiveResourcesError,
  objectiveSupportTypeError,
] = OBJECTIVE_ERROR_MESSAGES;

export default function ObjectiveForm({
  index,
  removeObjective,
  setObjectiveError,
  objective,
  setObjective,
  errors,
  topicOptions,
  onUploadFiles,
  goalStatus,
  userCanEdit,
}) {
  // the parent objective data from props
  const {
    title,
    topics,
    resources,
    status,
    files,
    supportType,
  } = objective;

  const isOnReport = useMemo(() => (
    objective.activityReports && objective.activityReports.length > 0
  ), [objective.activityReports]);

  const isOnApprovedReport = useMemo(() => (
    (objective.activityReports && objective.activityReports.some((report) => (
      report.status === REPORT_STATUSES.APPROVED
    )))
  ), [objective.activityReports]);

  const { isAppLoading } = useContext(AppLoadingContext);

  const modalRef = useRef(null);

  // onchange handlers
  const onChangeTitle = (e) => setObjective({ ...objective, title: e.target.value });
  const onChangeTopics = (newTopics) => setObjective({ ...objective, topics: newTopics });
  const setResources = (newResources) => setObjective({ ...objective, resources: newResources });
  const onChangeFiles = (e) => {
    setObjective({ ...objective, files: e });
  };
  const onChangeStatus = (newStatus) => setObjective({ ...objective, status: newStatus });
  const onChangeSupportType = (newSupportType) => setObjective(
    {
      ...objective,
      supportType: newSupportType,
    },
  );

  const onUpdateStatus = (newStatus) => {
    if (newStatus === 'Suspended') {
      modalRef.current.toggleModal();
      return;
    }
    onChangeStatus(newStatus);
  };

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

  const validateSupportType = () => {
    if (!supportType) {
      const newErrors = [...errors];
      newErrors.splice(OBJECTIVE_FORM_FIELD_INDEXES.SUPPORT_TYPE, 1, <span className="usa-error-message">{objectiveSupportTypeError}</span>);
      setObjectiveError(index, newErrors);
    } else {
      const newErrors = [...errors];
      newErrors.splice(OBJECTIVE_FORM_FIELD_INDEXES.SUPPORT_TYPE, 1, <></>);
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

  const setSuspendReasonError = () => {
    const newErrors = [...errors];
    newErrors.splice(OBJECTIVE_FORM_FIELD_INDEXES.STATUS_SUSPEND_REASON, 1, <span className="usa-error-message">Select a reason for suspension</span>);
    setObjectiveError(index, newErrors);
  };

  return (
    <div className="margin-top-5 ttahub-create-goals-objective-form">
      <div className="display-flex flex-justify maxw-mobile-lg">
        <h3 className="margin-bottom-0">Objective summary</h3>
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
        isLoading={isAppLoading}
        userCanEdit={userCanEdit}
      />

      <ObjectiveTopics
        error={errors[OBJECTIVE_FORM_FIELD_INDEXES.TOPICS]}
        topicOptions={topicOptions}
        validateObjectiveTopics={validateObjectiveTopics}
        topics={topics}
        onChangeTopics={onChangeTopics}
        goalStatus={goalStatus}
        isOnReport={isOnReport || false}
        isLoading={isAppLoading}
        userCanEdit={userCanEdit}
      />

      <ResourceRepeater
        resources={resources}
        setResources={setResources}
        validateResources={validateResources}
        error={errors[OBJECTIVE_FORM_FIELD_INDEXES.RESOURCES]}
        isOnReport={isOnReport || false}
        goalStatus={goalStatus}
        isLoading={isAppLoading}
        userCanEdit={userCanEdit}
        toolTipText="Copy & paste web address of TTA resource you'll use for this objective. Usually an ECLKC page."
      />
      { title && (
      <ObjectiveFiles
        files={files ? files.map((f) => ({ ...f, objectiveIds: objective.ids })) : []}
        onChangeFiles={onChangeFiles}
        objective={objective}
        isOnReport={isOnReport || false}
        isLoading={isAppLoading}
        onUploadFiles={onUploadFiles}
        index={index}
        goalStatus={goalStatus}
        userCanEdit={userCanEdit}
        selectedObjectiveId={objective.id}
      />
      )}

      <ObjectiveSuspendModal
        objectiveId={objective.id}
        modalRef={modalRef}
        objectiveSuspendReason={objective.closeSuspendReason}
        onChangeSuspendReason={(e) => setObjective(
          { ...objective, closeSuspendReason: e.target.value },
        )}
        objectiveSuspendInputName={`suspend-objective-${objective.id}-reason`}
        objectiveSuspendContextInputName={`suspend-objective-${objective.id}-context`}
        objectiveSuspendContext={objective.closeSuspendContext}
        onChangeSuspendContext={(e) => setObjective({
          ...objective,
          closeSuspendContext: e.target.value,
        })}
        onChangeStatus={onChangeStatus}
        setError={setSuspendReasonError}
        error={errors[OBJECTIVE_FORM_FIELD_INDEXES.STATUS_SUSPEND_REASON]}
      />

      <ObjectiveSupportType
        onBlurSupportType={validateSupportType}
        supportType={supportType || ''}
        onChangeSupportType={onChangeSupportType}
        inputName={`objective-support-type-${index}`}
        error={errors[OBJECTIVE_FORM_FIELD_INDEXES.SUPPORT_TYPE]}
      />

      <ObjectiveStatus
        status={status}
        goalStatus={goalStatus}
        onChangeStatus={onUpdateStatus}
        inputName={`objective-status-${index}`}
        isLoading={isAppLoading}
        userCanEdit={userCanEdit}
      />

      <ObjectiveStatusSuspendReason
        status={status}
        closeSuspendContext={objective.closeSuspendContext}
        closeSuspendReason={objective.closeSuspendReason}
      />

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
    closeSuspendReason: PropTypes.string,
    closeSuspendContext: PropTypes.string,
    isNew: PropTypes.bool,
    supportType: PropTypes.string,
    id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ]),
    ids: PropTypes.arrayOf(PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ])),
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
  onUploadFiles: PropTypes.func.isRequired,
  userCanEdit: PropTypes.bool.isRequired,
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
    supportType: '',
  },
};
