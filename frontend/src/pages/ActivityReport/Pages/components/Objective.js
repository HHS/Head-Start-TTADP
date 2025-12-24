import React, {
  useState,
  useContext,
  useRef,
  useMemo,
  useEffect,
} from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import { Link } from 'react-router-dom';
import {
  useController, useFormContext, useWatch,
} from 'react-hook-form';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import {
  Alert,
} from '@trussworks/react-uswds';
import ObjectiveTitle from './ObjectiveTitle';
import GenericSelectWithDrawer from '../../../../components/GoalForm/GenericSelectWithDrawer';
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
  OBJECTIVE_CITATIONS,
} from './goalValidator';
import { validateListOfResources, noDisallowedUrls } from '../../../../components/GoalForm/constants';
import AppLoadingContext from '../../../../AppLoadingContext';
import './Objective.scss';
import ObjectiveSuspendModal from '../../../../components/ObjectiveSuspendModal';
import IpdCourseSelect from '../../../../components/ObjectiveCourseSelect';
import FormFieldThatIsSometimesReadOnly from '../../../../components/GoalForm/FormFieldThatIsSometimesReadOnly';
import ContentFromFeedByTag from '../../../../components/ContentFromFeedByTag';
import CitationDrawerContent from '../../../../components/CitationDrawerContent';
import { OBJECTIVE_STATUS } from '../../../../Constants';

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
  citationOptions,
  rawCitations,
  isMonitoringGoal,
  objectiveOptions,
}) {
  const modalRef = useRef();

  const citationNames = useMemo(() => rawCitations.map((rawCitation) => rawCitation.citation),
    [rawCitations]);

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
  const {
    getValues, setError, clearErrors, watch,
  } = useFormContext();
  const { setAppLoadingText, setIsAppLoading } = useContext(AppLoadingContext);
  const { objectiveCreatedHere } = initialObjective;
  const [onApprovedAR, setOnApprovedAR] = useState(initialObjective.onApprovedAR);
  const [citationWarnings, setCitationWarnings] = useState([]);
  const activityRecipients = watch('activityRecipients');
  const selectedGoals = useWatch({ name: 'goals' });

  // This serves as sort of a refresh to ensure that we have the latest options and selected
  // Objective before we attempt to lookup the objective status,
  // note this is NOT the aro status, but the objective status from the options.
  useEffect(() => {
    if (objective && objectiveOptions) {
      const origObjStatus = objectiveOptions.find((opt) => opt.id === objective.id)?.status;
      setStatusForCalculations(origObjStatus);
    }
  }, [objective, objective.id, objectiveOptions]);

  /**
   * add controllers for all the controlled fields
   * react hook form uses uncontrolled fields by default
   * but we want to keep the logic in one place for the AR/RTR
   * if at all possible
   */
  const {
    field: {
      onChange: onChangeCitations,
      onBlur: onBlurCitations,
      value: objectiveCitations,
      name: objectiveCitationsInputName,
    },
  } = useController({
    name: `${fieldArrayName}[${index}].citations`,
    rules: {
      validate: {
        notEmpty: (value) => (value && value.length) || OBJECTIVE_CITATIONS,
      },
    },
    // If citations are not available, set citations to null
    defaultValue: objective.citations,
  });

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
        noNullId: (value) => value.every((topic) => topic.id) || OBJECTIVE_TOPICS,
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
      onChange: onChangeUseFiles,
      value: objectiveUseFiles,
    },
  } = useController({
    name: `${fieldArrayName}[${index}].useFiles`,
    defaultValue: objective.useFiles ?? !!(objective.files && objective.files.length),
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
    defaultValue: objective.useIpdCourses ?? !!(objective.courses && objective.courses.length),
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
    defaultValue: objective.status || OBJECTIVE_STATUS.NOT_STARTED,
  });

  const {
    field: {
      onChange: onChangeSuspendReason,
      value: objectiveSuspendReason,
      name: objectiveSuspendInputName,
    },
  } = useController({
    rules: {
      required: objective.status === OBJECTIVE_STATUS.SUSPENDED,
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
    onChangeUseFiles(newObjective.useFiles ?? !!(newObjective.files && newObjective.files.length));
    onObjectiveChange(newObjective, index); // Call parent on objective change.

    // set a new initial status, which we went to preserve separately from the dropdown
    // this determines if the title is read only or not
    setStatusForCalculations(newObjective.status);

    // ipd course
    onChangeUseIpdCourses(!!(newObjective.courses && newObjective.courses.length));
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

    if (updatedStatus === OBJECTIVE_STATUS.SUSPENDED) {
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

  // Store the complete citation in ActivityReportObjectiveCitations in the DB row.
  const selectedCitationsChanged = (newCitations) => {
    const newCitationStandardIds = newCitations.map((newCitation) => newCitation.id);
    // From rawCitations get all the raw citations with the same standardId as the newCitations.
    const newCitationsObjects = rawCitations.filter(
      (rawCitation) => newCitationStandardIds.includes(rawCitation.standardId),
    ).map((rawCitation) => (
      {
        ...rawCitation,
        id: rawCitation.standardId,
        name: newCitations.find(
          (newCitation) => newCitation.id === rawCitation.standardId,
        ).name,
        monitoringReferences:
        [
          ...rawCitation.grants.map((grant) => ({
            ...grant,
            standardId: rawCitation.standardId,
            name: newCitations.find(
              (newCitation) => newCitation.id === rawCitation.standardId,
            ).name,
          })),
        ],
      }));

    onChangeCitations([...newCitationsObjects]);
  };

  useDeepCompareEffect(() => {
    // Get a distinct list of grantId's from the citation.grants array.
    if ((!objectiveCitations || !objectiveCitations.length)
        || (selectedGoals && selectedGoals.length > 0)) {
      if (citationWarnings.length > 0) {
        setCitationWarnings([]);
      }
      return;
    }
    const grantIdsWithCitations = Array.from(objectiveCitations.reduce((acc, citation) => {
      const grantsToAdd = citation.monitoringReferences.map((grant) => grant.grantId);
      return new Set([...acc, ...grantsToAdd]);
    }, new Set()));

    // Find all the grantIds not in grantIdsWithCitations.
    const missingRecipientGrantNames = (activityRecipients || []).filter(
      (recipient) => !grantIdsWithCitations.includes(recipient.activityRecipientId),
    ).map((recipient) => recipient.name);

    setCitationWarnings(missingRecipientGrantNames);
  }, [objectiveCitations, activityRecipients, selectedGoals, citationWarnings]);

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
          statusForCalculations !== OBJECTIVE_STATUS.COMPLETE
          && statusForCalculations !== OBJECTIVE_STATUS.SUSPENDED,
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
      {
        isMonitoringGoal && citationWarnings.length > 0 && (
          <Alert type="warning" className="margin-bottom-2">
            <span>
              <span className="margin-top-0">
                {citationWarnings.length > 1
                  ? 'These grants do not have any of the citations selected:'
                  : 'This grant does not have any of the citations selected:'}
                <ul className="margin-top-2">
                  {citationWarnings.map((grant) => (
                    <li key={grant}>{grant}</li>
                  ))}
                </ul>
              </span>
              <span className="margin-top-2 margin-bottom-0">
                To avoid errors when submitting the report, you can either:
                <ul className="margin-top-2 margin-bottom-0">
                  <li>
                    Add a citation for this grant under an objective for the monitoring goal
                  </li>
                  <li>
                    Remove the grant from the
                    {' '}
                    <Link to={`/activity-reports/${reportId}/activity-summary`}>Activity summary</Link>
                  </li>
                  <li>
                    Add another goal to the report
                  </li>
                </ul>
              </span>
            </span>
          </Alert>
        )
      }
      {
        isMonitoringGoal && (
          <GenericSelectWithDrawer
            error={errors.citations
              ? ERROR_FORMAT(errors.citations.message)
              : NO_ERROR}
            name="Citation"
            options={citationOptions}
            validateValues={onBlurCitations}
            values={objectiveCitations}
            onChangeValues={selectedCitationsChanged}
            inputName={objectiveCitationsInputName}
            drawerButtonText="Get help choosing citations"
            drawerTitle="Citation guidance"
            drawerContent={(
              <CitationDrawerContent
                citations={citationNames}
              />
            )}
          />
        )
      }

      <GenericSelectWithDrawer
        error={errors.topics
          ? ERROR_FORMAT(errors.topics.message)
          : NO_ERROR}
        name="Topic"
        options={topicOptions}
        validateValues={onBlurTopics}
        values={objectiveTopics}
        onChangeValues={onChangeTopics}
        inputName={objectiveTopicsInputName}
        drawerTitle="Topic guidance"
        drawerButtonText="Get help choosing topics"
        drawerContent={useMemo(() => <ContentFromFeedByTag className="ttahub-drawer--objective-topics-guidance" tagName="ttahub-topic" contentSelector="table" />, [])}
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
        goalStatus={parentGoal ? parentGoal.status : GOAL_STATUS.NOT_STARTED}
        label="Did you use any other TTA resources that aren't available as link?"
        selectedObjectiveId={selectedObjective.id}
        userCanEdit
        editingFromActivityReport
        useFiles={objectiveUseFiles}
        onChangeUseFiles={onChangeUseFiles}
        error={errors.files ? errors.files.message : ''}
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
        currentStatus={statusForCalculations}
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
    citations: PropTypes.shape({
      message: PropTypes.string,
    }),
    files: PropTypes.shape({
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
  rawCitations: PropTypes.arrayOf(PropTypes.shape({
    standardId: PropTypes.number,
    citation: PropTypes.string,
    // Create array of jsonb objects
    grants: PropTypes.arrayOf(PropTypes.shape({
      grantId: PropTypes.number,
      findingId: PropTypes.string,
      reviewName: PropTypes.string,
      grantNumber: PropTypes.string,
      reportDeliveryDate: PropTypes.string,
    })),
  })),
  citationOptions: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
  })),
  isMonitoringGoal: PropTypes.bool,
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
  objectiveOptions: PropTypes.arrayOf(OBJECTIVE_PROP).isRequired,
};

Objective.defaultProps = {
  citationOptions: [],
  rawCitations: [],
  isMonitoringGoal: false,
};
