import React, {
  useState, useContext, useRef,
} from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import {
  useController, useFormContext,
} from 'react-hook-form';
import ObjectiveTitle from './ObjectiveTitle';
import ObjectiveTopics from '../../../../components/GoalForm/ObjectiveTopics';
import ResourceRepeater from '../../../../components/GoalForm/ResourceRepeater';
import ObjectiveFiles from '../../../../components/GoalForm/ObjectiveFiles';
import ObjectiveTta from './ObjectiveTta';
import ObjectiveStatus from './ObjectiveStatus';
import ObjectiveSelect from './ObjectiveSelect';
import ObjectiveSupportType from '../../../../components/ObjectiveSupportType';
import { OBJECTIVE_PROP, NO_ERROR, ERROR_FORMAT } from './constants';
import { uploadObjectivesFile } from '../../../../fetchers/File';
import {
  OBJECTIVE_TITLE,
  OBJECTIVE_TTA,
  OBJECTIVE_TOPICS,
} from './goalValidator';
import { validateListOfResources, noDisallowedUrls } from '../../../../components/GoalForm/constants';
import AppLoadingContext from '../../../../AppLoadingContext';
import './Objective.scss';
import ObjectiveSuspendModal from '../../../../components/ObjectiveSuspendModal';
import IpdCourseSelect from '../../../../components/ObjectiveCourseSelect';
import FormFieldThatIsSometimesReadOnly from '../../../../components/GoalForm/FormFieldThatIsSometimesReadOnly';

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
}) {
  const modalRef = useRef();

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
  const { getValues, setError, clearErrors } = useFormContext();
  const { setAppLoadingText, setIsAppLoading } = useContext(AppLoadingContext);
  const { objectiveCreatedHere } = initialObjective;
  const [onApprovedAR, setOnApprovedAR] = useState(initialObjective.onApprovedAR);

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
        noDisallowedUrls,
        allResourcesAreValid: (value) => validateListOfResources(value) || 'Enter one resource per field. Valid resource links must start with http:// or https://',
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
      onChange: onChangeUseIpdCourses,
      onBlur: onBlurUseIpdCourses,
      value: objectiveUseIpdCourses,
      name: objectiveUseIpdCoursesInputName,
    },
  } = useController({
    name: `${fieldArrayName}[${index}].useIpdCourses`,
    defaultValue: !!(objective.courses && objective.courses.length) || false,
  });

  const {
    field: {
      onChange: onChangeIpdCourses,
      onBlur: onBlurIpdCourses,
      value: objectiveIpdCourses,
      name: objectiveIpdCoursesInputName,
    },
  } = useController({
    name: `${fieldArrayName}[${index}].courses`,
    defaultValue: objective.courses || [],
    rules: {
      validate: (value) => (objectiveUseIpdCourses && value.length > 0) || 'Select at least one course',
    },
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
      onChange: onChangeSupportType,
      onBlur: onBlurSupportType,
      value: supportType,
      name: supportTypeInputName,
    },
  } = useController({
    name: `${fieldArrayName}[${index}].supportType`,
    rules: {
      required: 'Please select a support type',
    },
    defaultValue: objective.supportType || '',
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

  const {
    field: {
      onChange: onChangeSuspendReason,
      value: objectiveSuspendReason,
      name: objectiveSuspendInputName,
    },
  } = useController({
    rules: {
      required: objective.status === 'Suspended',
    },
    name: `${fieldArrayName}[${index}].closeSuspendReason`,
    defaultValue: objective.closeSuspendReason || '',
  });

  const {
    field: {
      onChange: onChangeSuspendContext,
      value: objectiveSuspendContext,
      name: objectiveSuspendContextInputName,
    },
  } = useController({
    name: `${fieldArrayName}[${index}].closeSuspendContext`,
    rules: { required: true },
    defaultValue: objective.closeSuspendContext || '',
  });

  const {
    field: {
      value: createdHere,
      onChange: onChangeCreatedHere,
    },
  } = useController({
    name: `${fieldArrayName}[${index}].createdHere`,
    defaultValue: objectiveCreatedHere || null,
  });

  const isOnReport = objective.onAR;

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
    onChangeSupportType(newObjective.supportType);
    onChangeTopics(newObjective.topics);
    onChangeFiles(newObjective.files || []);
    onObjectiveChange(newObjective, index); // Call parent on objective change.

    // set a new initial status, which we went to preserve separately from the dropdown
    // this determines if the title is read only or not
    setStatusForCalculations(newObjective.status);

    // ipd course
    onChangeUseIpdCourses(newObjective.courses && newObjective.courses.length);
    onChangeIpdCourses(newObjective.courses);

    // was objective created on this report?
    onChangeCreatedHere(newObjective.objectiveCreatedHere);

    // keep track of whether the objective is on an approved report
    setOnApprovedAR(newObjective.onApprovedAR);
  };

  const onUploadFile = async (files, _objective, setUploadError) => {
    // we need to access the updated form data to
    // get the correct objective ids to attach to our API post
    const objectivesField = getValues(fieldArrayName);
    let objectiveToAttach = objectivesField.find((o) => o.id === selectedObjective.id);

    if (!objectiveToAttach) {
      objectiveToAttach = selectedObjective;
    }

    // handle file upload
    try {
      setIsAppLoading(true);
      setAppLoadingText('Uploading');
      const data = new FormData();
      data.append('reportId', JSON.stringify(reportId));
      data.append('objectiveIds', JSON.stringify(!objectiveToAttach.ids ? [0] : objectiveToAttach.ids));
      files.forEach((file) => {
        data.append('file', file);
      });

      const response = await uploadObjectivesFile(data);
      return response;
    } catch (error) {
      setUploadError('There was an error uploading your file(s).');
      return null;
    } finally {
      setIsAppLoading(false);
    }
  };

  const resourcesForRepeater = objectiveResources && objectiveResources.length ? objectiveResources : [{ key: uuidv4(), value: '' }];
  const onRemove = () => remove(index);

  const onUpdateStatus = (event) => {
    const { value: updatedStatus } = event.target;

    if (updatedStatus === 'Suspended') {
      modalRef.current.toggleModal();
      return;
    }

    onChangeSuspendContext('');
    onChangeSuspendReason('');
    onChangeStatus(updatedStatus);
  };

  const setStatusReasonError = (on) => {
    if (on) {
      setError(`${fieldArrayName}[${index}].closeSuspendReason`, {
        type: 'required',
        message: 'Reason for suspension is required',
      });
    } else {
      clearErrors(`${fieldArrayName}[${index}].closeSuspendReason`);
    }
  };

  return (
    <>
      <ObjectiveSelect
        onChange={onChangeObjective}
        selectedObjectives={selectedObjective}
        options={options}
        onRemove={onRemove}
      />
      <FormFieldThatIsSometimesReadOnly
        label="TTA Objective"
        value={objectiveTitle}
        permissions={[
          createdHere,
          statusForCalculations !== 'Complete' && statusForCalculations !== 'Suspended',
          !onApprovedAR,
        ]}
      >
        <ObjectiveTitle
          error={errors.title
            ? ERROR_FORMAT(errors.title.message)
            : NO_ERROR}
          title={objectiveTitle}
          onChangeTitle={onChangeTitle}
          validateObjectiveTitle={onBlurTitle}
          inputName={objectiveTitleInputName}
          initialObjectiveStatus={statusForCalculations}
        />
      </FormFieldThatIsSometimesReadOnly>
      <ObjectiveTopics
        error={errors.topics
          ? ERROR_FORMAT(errors.topics.message)
          : NO_ERROR}
        topicOptions={topicOptions}
        validateObjectiveTopics={onBlurTopics}
        topics={objectiveTopics}
        onChangeTopics={onChangeTopics}
        inputName={objectiveTopicsInputName}
      />

      <IpdCourseSelect
        error={errors.courses
          ? ERROR_FORMAT(errors.courses.message)
          : NO_ERROR}
        inputName={objectiveIpdCoursesInputName}
        onChange={onChangeIpdCourses}
        onBlur={onBlurIpdCourses}
        value={objectiveIpdCourses}
        onChangeUseIpdCourses={onChangeUseIpdCourses}
        onBlurUseIpdCourses={onBlurUseIpdCourses}
        useIpdCourse={objectiveUseIpdCourses}
        useCoursesInputName={objectiveUseIpdCoursesInputName}
        className="margin-top-3"
      />

      <ResourceRepeater
        resources={resourcesForRepeater}
        isOnReport={isOnReport || false}
        setResources={onChangeResources}
        error={errors.resources ? errors.resources.message : ''}
        validateResources={onBlurResources}
        inputName={objectiveResourcesInputName}
        userCanEdit
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
        label="Did you use any other TTA resources that aren't available as link?"
        selectedObjectiveId={selectedObjective.id}
        userCanEdit
        editingFromActivityReport
      />
      <ObjectiveTta
        ttaProvided={objectiveTta}
        onChangeTTA={onChangeTta}
        inputName={objectiveTtaInputName}
        status={objectiveStatus}
        isOnApprovedReport={false}
        error={errors.ttaProvided
          ? ERROR_FORMAT(errors.ttaProvided.message)
          : NO_ERROR}
        validateTta={onBlurTta}
      />
      <ObjectiveSupportType
        onBlurSupportType={onBlurSupportType}
        supportType={supportType}
        onChangeSupportType={onChangeSupportType}
        inputName={supportTypeInputName}
        error={errors.supportType
          ? ERROR_FORMAT(errors.supportType.message)
          : NO_ERROR}
      />

      <ObjectiveSuspendModal
        objectiveId={selectedObjective.id}
        modalRef={modalRef}
        objectiveSuspendReason={objectiveSuspendReason}
        onChangeSuspendReason={onChangeSuspendReason}
        objectiveSuspendInputName={objectiveSuspendInputName}
        objectiveSuspendContextInputName={objectiveSuspendContextInputName}
        objectiveSuspendContext={objectiveSuspendContext}
        onChangeSuspendContext={onChangeSuspendContext}
        onChangeStatus={onChangeStatus}
        setError={setStatusReasonError}
        error={errors.closeSuspendReason}
      />

      <ObjectiveStatus
        onBlur={onBlurStatus}
        inputName={objectiveStatusInputName}
        status={objectiveStatus}
        onChangeStatus={onUpdateStatus}
        userCanEdit
        closeSuspendContext={objectiveSuspendContext}
        closeSuspendReason={objectiveSuspendReason}
      />
    </>
  );
}

Objective.propTypes = {
  index: PropTypes.number.isRequired,
  objective: OBJECTIVE_PROP.isRequired,
  errors: PropTypes.shape({
    supportType: PropTypes.shape({
      message: PropTypes.string,
    }),
    ttaProvided: PropTypes.shape({
      message: PropTypes.string,
    }),
    title: PropTypes.shape({
      message: PropTypes.string,
    }),
    resources: PropTypes.shape({
      message: PropTypes.string,
    }),
    courses: PropTypes.shape({
      message: PropTypes.string,
    }),
    roles: PropTypes.shape({
      message: PropTypes.string,
    }),
    topics: PropTypes.shape({
      message: PropTypes.string,
    }),
    closeSuspendReason: PropTypes.shape({
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
};
