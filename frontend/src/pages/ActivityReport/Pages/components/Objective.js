import React, { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import {
  useController, useFormContext,
} from 'react-hook-form/dist/index.ie11';
import ObjectiveTitle from './ObjectiveTitle';
import { REPORT_STATUSES } from '../../../../Constants';
import SpecialistRole from '../../../../components/GoalForm/SpecialistRole';
import ObjectiveTopics from '../../../../components/GoalForm/ObjectiveTopics';
import ResourceRepeater from '../../../../components/GoalForm/ResourceRepeater';
import ObjectiveFiles from '../../../../components/GoalForm/ObjectiveFiles';
import ObjectiveTta from './ObjectiveTta';
import ObjectiveStatus from './ObjectiveStatus';
import ObjectiveSelect from './ObjectiveSelect';
import { OBJECTIVE_PROP, NO_ERROR, ERROR_FORMAT } from './constants';
import { uploadObjectivesFile } from '../../../../fetchers/File';
import {
  OBJECTIVE_TITLE,
  OBJECTIVE_ROLE,
  OBJECTIVE_RESOURCES,
  OBJECTIVE_TTA,
  OBJECTIVE_TOPICS,
} from './goalValidator';
import { validateListOfResources } from '../../../../components/GoalForm/constants';
import './Objective.scss';

export default function Objective({
  objective,
  topicOptions,
  options,
  index,
  remove,
  fieldArrayName,
  errors,
  roles,
  onObjectiveChange,
  onSaveDraft,
  reportId,
}) {
  const [selectedObjective, setSelectedObjective] = useState(objective);
  const { getValues } = useFormContext();

  /**
   * add controllers for all the controlled fields
   * react hook form uses uncontrolled fields by default
   * but we want to keep the logic in one place for the AR/RTR
   * if at all possible
   */

  const {
    field: {
      onChange: onChangeTitle,
      onBlur: onBlurTitle,
      value: objectiveTitle,
      name: objectiveTitleInputName,
    },
  } = useController({
    name: `${fieldArrayName}[${index}].title`,
    rules: {
      required: {
        value: true,
        message: OBJECTIVE_TITLE,
      },
    },
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
    rules: {
      validate: {
        notEmpty: (value) => (value && value.length) || OBJECTIVE_TOPICS,
      },
    },
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
    rules: {
      validate: {
        allResourcesAreValid: (value) => validateListOfResources(value) || OBJECTIVE_RESOURCES,
      },
    },
    defaultValue: objective.resources,
  });

  const {
    field: {
      onChange: onChangeFiles,
      onBlur: onBlurFiles,
      value: objectiveFiles,
      name: objectiveFilesInputName,
    },
  } = useController({
    name: `${fieldArrayName}[${index}].files`,
    defaultValue: objective.files || [],
  });

  const defaultRoles = useMemo(() => (
    roles.length === 1 ? roles : objective.roles
  ), [objective.roles, roles]);

  const {
    field: {
      onChange: onChangeRoles,
      onBlur: onBlurRoles,
      value: objectiveRoles,
      name: objectiveRolesInputName,
    },
  } = useController({
    name: `${fieldArrayName}[${index}].roles`,
    rules: {
      validate: {
        notEmpty: (value) => (value && value.length) || OBJECTIVE_ROLE,
      },
    },
    defaultValue: defaultRoles,
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
    rules: {
      validate: {
        notEmptyTag: (value) => (value && value.trim() !== '<p></p>') || OBJECTIVE_TTA,
      },
    },
    defaultValue: objective.ttaProvided ? objective.ttaProvided : '',
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
    defaultValue: objective.status || 'Not Started',
  });

  const isOnApprovedReport = useMemo(() => objective.activityReports
    && objective.activityReports.some(
      (report) => report.status === REPORT_STATUSES.APPROVED,
    ), [objective.activityReports]);

  const isOnReport = useMemo(() => (
    objective.activityReports && objective.activityReports.length
  ), [objective.activityReports]);

  const onChangeObjective = (newObjective) => {
    setSelectedObjective(newObjective);
    onChangeResources(newObjective.resources);
    onChangeTitle(newObjective.title);
    onChangeTta(newObjective.ttaProvided || '');
    onChangeStatus(newObjective.status);
    onChangeRoles(newObjective.roles || []);
    onChangeTopics(newObjective.topics);
    onChangeFiles(newObjective.files || []);
    onObjectiveChange(newObjective, index); // Call parent on objective change.
  };

  const onUploadFile = async (files, _objective, setError) => {
    // we save draft one of two ways, depending on whether it is a
    // recipient report or not
    await onSaveDraft();

    // we also need to access the updated form data to
    // get the correct objective ids to attach to our API post
    const objectivesField = getValues(fieldArrayName);
    const objectiveToAttach = objectivesField[index];

    // handle file upload
    try {
      const data = new FormData();
      data.append('objectiveIds', JSON.stringify(objectiveToAttach.ids));
      files.forEach((file) => {
        data.append('file', file);
      });

      return uploadObjectivesFile(data);
    } catch (error) {
      setError('There was an error uploading your file(s).');
      return null;
    }
  };

  // we need to auto select an objective role if there is only one available
  useEffect(() => {
    if (defaultRoles.length === 1 && !objectiveRoles.length) {
      onChangeRoles(defaultRoles);
    }
  }, [defaultRoles, objectiveRoles.length, onChangeRoles]);

  let savedTopics = [];
  let savedResources = [];

  if (isOnApprovedReport) {
    savedTopics = objective.topics;
    savedResources = objective.resources;
  }

  const resourcesForRepeater = objectiveResources && objectiveResources.length ? objectiveResources : [{ key: uuidv4(), value: '' }];

  const onRemove = () => remove(index);

  return (
    <>
      <ObjectiveSelect
        onChange={onChangeObjective}
        selectedObjectives={selectedObjective}
        options={options}
        onRemove={onRemove}
      />
      <ObjectiveTitle
        error={errors.title
          ? ERROR_FORMAT(errors.title.message)
          : NO_ERROR}
        isOnApprovedReport={isOnApprovedReport || false}
        title={objectiveTitle}
        onChangeTitle={onChangeTitle}
        validateObjectiveTitle={onBlurTitle}
        status={objectiveStatus}
        inputName={objectiveTitleInputName}
        isOnReport={isOnReport || false} // todo - fix this for being on AR
      />
      <SpecialistRole
        isOnReport={isOnReport || false}
        status={objectiveStatus}
        error={errors.roles
          ? ERROR_FORMAT(errors.roles.message)
          : NO_ERROR}
        onChange={onChangeRoles}
        selectedRoles={objectiveRoles}
        inputName={objectiveRolesInputName}
        validateSpecialistRole={onBlurRoles}
        roleOptions={roles}
      />
      <ObjectiveTopics
        error={errors.topics
          ? ERROR_FORMAT(errors.topics.message)
          : NO_ERROR}
        savedTopics={savedTopics}
        topicOptions={topicOptions}
        validateObjectiveTopics={onBlurTopics}
        topics={isOnApprovedReport ? [] : objectiveTopics}
        isOnReport={isOnReport || false}
        isOnApprovedReport={isOnApprovedReport || false}
        onChangeTopics={onChangeTopics}
        inputName={objectiveTopicsInputName}
        status={objectiveStatus}
      />
      <ResourceRepeater
        resources={isOnApprovedReport ? [] : resourcesForRepeater}
        isOnReport={isOnReport || false}
        setResources={onChangeResources}
        error={errors.resources
          ? ERROR_FORMAT(errors.resources.message)
          : NO_ERROR}
        validateResources={onBlurResources}
        savedResources={savedResources}
        status={objectiveStatus}
        inputName={objectiveResourcesInputName}
      />
      <ObjectiveFiles
        objective={objective}
        files={objectiveFiles}
        onChangeFiles={onChangeFiles}
        status={objectiveStatus}
        isOnReport={isOnReport || false}
        onUploadFiles={onUploadFile}
        index={index}
        onBlur={onBlurFiles}
        inputName={objectiveFilesInputName}
        reportId={reportId}
      />
      <ObjectiveTta
        ttaProvided={objectiveTta}
        onChangeTTA={onChangeTta}
        inputName={objectiveTtaInputName}
        status={objectiveStatus}
        isOnApprovedReport={isOnApprovedReport || false}
        error={errors.ttaProvided
          ? ERROR_FORMAT(errors.ttaProvided.message)
          : NO_ERROR}
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
  errors: PropTypes.shape({
    ttaProvided: PropTypes.shape({
      message: PropTypes.string,
    }),
    title: PropTypes.shape({
      message: PropTypes.string,
    }),
    resources: PropTypes.shape({
      message: PropTypes.string,
    }),
    roles: PropTypes.shape({
      message: PropTypes.string,
    }),
    topics: PropTypes.shape({
      message: PropTypes.string,
    }),
  }).isRequired,
  topicOptions: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
  })).isRequired,
  options: PropTypes.arrayOf(
    OBJECTIVE_PROP,
  ).isRequired,
  remove: PropTypes.func.isRequired,
  fieldArrayName: PropTypes.string.isRequired,
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
  onObjectiveChange: PropTypes.func.isRequired,
  onSaveDraft: PropTypes.func.isRequired,
  reportId: PropTypes.number.isRequired,
};
