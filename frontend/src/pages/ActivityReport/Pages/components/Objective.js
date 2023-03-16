import React, {
  useState, useMemo, useContext, useRef,
} from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import { ModalToggleButton } from '@trussworks/react-uswds';
import { useController } from 'react-hook-form/dist/index.ie11';
import ObjectiveTitle from './ObjectiveTitle';
import { REPORT_STATUSES } from '../../../../Constants';
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
  OBJECTIVE_RESOURCES,
  OBJECTIVE_TTA,
  OBJECTIVE_TOPICS,
} from './goalValidator';
import { validateListOfResources } from '../../../../components/GoalForm/constants';
import AppLoadingContext from '../../../../AppLoadingContext';
import './Objective.scss';

export default function Objective({
  objective,
  topicOptions,
  options,
  index,
  remove,
  fieldArrayName,
  errors,
  onObjectiveChange,
  parentGoal,
  initialObjectiveStatus,
  reportId,
  hideSelect,
}) {
  // the below is a concession to the fact that the objective may
  // exist pre-migration to the new UI, and might not have complete data
  const initialObjective = (() => ({
    ...objective,
    id: objective.id || objective.value,
    value: objective.value || objective.id,
    label: objective.label || objective.title,
  }))();
  const [selectedObjective, setSelectedObjective] = useState(initialObjective);
  const [statusForCalculations, setStatusForCalculations] = useState(initialObjectiveStatus);
  const { setAppLoadingText, setIsAppLoading } = useContext(AppLoadingContext);
  const modalRef = useRef(null);

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

    // we only want to set the tta provided if it already exists, otherwise
    // we don't want to clear the value in the field
    if (newObjective.ttaProvided && newObjective.ttaProvided !== '<p></p>') {
      onChangeTta(newObjective.ttaProvided);
    }

    onChangeStatus(newObjective.status);
    onChangeTopics(newObjective.topics);
    onChangeFiles(newObjective.files || []);
    onObjectiveChange(newObjective, index); // Call parent on objective change.

    // set a new initial status, which we went to preserve separately from the dropdown
    // this determines if the title is read only or not
    setStatusForCalculations(newObjective.status);
  };

  const onUploadFile = async (files, _objective, setError) => {
    // handle file upload
    try {
      setIsAppLoading(true);
      setAppLoadingText('Uploading');

      // we have access to the updated IDS because objectives are automatically
      // created when "create a new objective" is selected
      const objectiveIds = selectedObjective.ids;

      // if something has gone wrong, we can't upload the file
      if (!objectiveIds || !objectiveIds.length) {
        throw new Error('No objective ids available to upload resource file to');
      }

      const data = new FormData();
      data.append('objectiveIds', JSON.stringify(objectiveIds));
      files.forEach((file) => {
        data.append('file', file);
      });

      const response = await uploadObjectivesFile(data);
      return response;
    } catch (error) {
      setError('There was an error uploading your file(s).');
      return null;
    } finally {
      setIsAppLoading(false);
    }
  };

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
      {!hideSelect ? (
        <ObjectiveSelect
          onChange={onChangeObjective}
          selectedObjectives={selectedObjective}
          options={options}
          onRemove={onRemove}
        />
      ) : (
        <div className="display-flex flex-justify maxw-mobile-lg margin-top-5">
          <h3 className="margin-0">Objective summary</h3>
          { onRemove && (
          <ModalToggleButton
            modalRef={modalRef}
            type="button"
            className="ttahub-objective-select-remove-objective"
            unstyled
            onClick={onRemove}
          >
            Remove this objective
          </ModalToggleButton>
          )}
        </div>
      )}
      <ObjectiveTitle
        error={errors.title
          ? ERROR_FORMAT(errors.title.message)
          : NO_ERROR}
        isOnApprovedReport={isOnApprovedReport || false}
        title={objectiveTitle}
        onChangeTitle={onChangeTitle}
        validateObjectiveTitle={onBlurTitle}
        inputName={objectiveTitleInputName}
        parentGoal={parentGoal}
        initialObjectiveStatus={statusForCalculations}
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
        goalStatus={parentGoal ? parentGoal.status : 'Not Started'}
        userCanEdit
        editingFromActivityReport
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
        inputName={objectiveResourcesInputName}
        goalStatus={parentGoal ? parentGoal.status : 'Not Started'}
        userCanEdit
        editingFromActivityReport
      />
      <ObjectiveFiles
        objective={objective}
        files={objectiveFiles}
        onChangeFiles={onChangeFiles}
        isOnReport={isOnReport || false}
        onUploadFiles={onUploadFile}
        index={index}
        onBlur={onBlurFiles}
        inputName={objectiveFilesInputName}
        reportId={reportId}
        goalStatus={parentGoal ? parentGoal.status : 'Not Started'}
        label="Did you use any TTA resources that aren't available as link?"
        selectedObjectiveId={selectedObjective.id}
        userCanEdit
        editingFromActivityReport
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
        userCanEdit
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
  onObjectiveChange: PropTypes.func.isRequired,
  parentGoal: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    status: PropTypes.string,
  }).isRequired,
  initialObjectiveStatus: PropTypes.string.isRequired,
  reportId: PropTypes.number.isRequired,
  hideSelect: PropTypes.bool,
};

Objective.defaultProps = {
  hideSelect: false,
};
