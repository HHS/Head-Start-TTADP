/* eslint-disable jsx-a11y/label-has-associated-control */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
} from '@trussworks/react-uswds';
import ObjectiveForm from './ObjectiveForm';
import PlusButton from './PlusButton';
import GrantSelect from './GrantSelect';
import GoalText from './GoalText';
import GoalDate from './GoalDate';
import {
  OBJECTIVE_DEFAULTS,
  OBJECTIVE_DEFAULT_ERRORS,
  FORM_FIELD_INDEXES,
} from './constants';
import './Form.scss';

export default function Form({
  possibleGrants,
  selectedGrants,
  setSelectedGrants,
  goalName,
  setGoalName,
  endDate,
  setEndDate,
  errors,
  validateGoalName,
  validateEndDate,
  validateGrantNumbers,
  objectives,
  setObjectives,
  setObjectiveError,
  topicOptions,
  isOnApprovedReport,
  isOnReport,
  status,
  datePickerKey,
  unchangingApiData,
  fetchError,
  goalNumber,
}) {
  const onUpdateText = (e) => setGoalName(e.target.value);

  const onAddNewObjectiveClick = () => {
    // copy existing state, add a blank
    const obj = [...objectives.map((o) => ({ ...o })), OBJECTIVE_DEFAULTS(objectives.length)];

    // save
    setObjectives(obj);
    setObjectiveError(obj.length - 1, OBJECTIVE_DEFAULT_ERRORS);
  };

  const removeObjective = (index) => {
    // copy existing state
    const obj = objectives.map((o) => ({ ...o }));
    obj.splice(index, 1);

    // save
    setObjectives(obj);
  };

  const setObjective = (data, index) => {
    const obj = objectives.map((o) => ({ ...o }));
    obj.splice(index, 1, data);
    setObjectives(obj);
  };

  const objectiveErrors = errors[FORM_FIELD_INDEXES.OBJECTIVES];

  const formTitle = goalNumber ? `Goal ${goalNumber}` : 'Recipient TTA goal';
  const hasNotStartedObjectives = objectives.some((objective) => objective.status && objective.status.toLowerCase() === 'not started');

  return (
    <div className="ttahub-create-goals-form">
      { fetchError ? <Alert type="error" role="alert">{ fetchError }</Alert> : null}
      <div className="display-flex flex-align-center">
        <h2>{formTitle}</h2>
        { status.toLowerCase() === 'draft'
        && (
          <span className="usa-tag smart-hub--table-tag-status smart-hub--status-draft padding-x-105 padding-y-1 margin-left-2">Draft</span>
        )}
      </div>
      <div>
        <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
        {' '}
        indicates required field
      </div>

      { isOnReport && hasNotStartedObjectives
        ? (
          <Alert type="info" noIcon>
            <p className="usa-prose">This goal is used on an activity report, so some fields can&apos;t be edited.</p>
          </Alert>
        )
        : null }

      <h3 className="margin-top-4 margin-bottom-3">Goal summary</h3>

      <GrantSelect
        selectedGrants={selectedGrants}
        isOnReport={isOnReport}
        setSelectedGrants={setSelectedGrants}
        possibleGrants={possibleGrants}
        validateGrantNumbers={validateGrantNumbers}
        error={errors[FORM_FIELD_INDEXES.GRANTS]}
      />

      <GoalText
        error={errors[FORM_FIELD_INDEXES.NAME]}
        goalName={goalName}
        isOnReport={isOnReport}
        validateGoalName={validateGoalName}
        onUpdateText={onUpdateText}
      />

      <GoalDate
        error={errors[FORM_FIELD_INDEXES.END_DATE]}
        isOnApprovedReport={isOnApprovedReport}
        setEndDate={setEndDate}
        endDate={endDate}
        validateEndDate={validateEndDate}
        datePickerKey={datePickerKey}
      />

      { objectives.map((objective, i) => (
        <ObjectiveForm
          index={i}
          objective={objective}
          removeObjective={removeObjective}
          setObjectiveError={setObjectiveError}
          key={objective.id}
          errors={objectiveErrors[i]}
          setObjective={(data) => setObjective(data, i)}
          topicOptions={topicOptions}
          goalStatus={status}
          unchangingApiData={unchangingApiData}
        />
      ))}

      <div className="margin-top-6">
        <PlusButton onClick={onAddNewObjectiveClick} text="Add new objective" />
      </div>

    </div>
  );
}

Form.propTypes = {
  isOnReport: PropTypes.bool.isRequired,
  isOnApprovedReport: PropTypes.bool.isRequired,
  errors: PropTypes.arrayOf(PropTypes.node).isRequired,
  validateGoalName: PropTypes.func.isRequired,
  validateEndDate: PropTypes.func.isRequired,
  validateGrantNumbers: PropTypes.func.isRequired,
  setObjectiveError: PropTypes.func.isRequired,
  possibleGrants: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    }),
  ).isRequired,
  selectedGrants: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    }),
  ).isRequired,
  setSelectedGrants: PropTypes.func.isRequired,
  goalName: PropTypes.string.isRequired,
  setGoalName: PropTypes.func.isRequired,
  recipient: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    grants: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        numberWithProgramTypes: PropTypes.string,
      }),
    ),
  }).isRequired,
  endDate: PropTypes.string,
  setEndDate: PropTypes.func.isRequired,
  setObjectives: PropTypes.func.isRequired,
  topicOptions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  })).isRequired,
  objectives: PropTypes.arrayOf(PropTypes.shape({
    objective: PropTypes.string,
    topics: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    })),
    resources: PropTypes.arrayOf(PropTypes.shape({
      key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      value: PropTypes.string,
    })),
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  })).isRequired,
  status: PropTypes.string.isRequired,
  datePickerKey: PropTypes.string.isRequired,
  unchangingApiData: PropTypes.objectOf(
    PropTypes.shape({
      resources: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        value: PropTypes.string,
      })),
      topics: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string,
        value: PropTypes.number,
      })),
    }),
  ).isRequired,
  fetchError: PropTypes.string.isRequired,
  goalNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

Form.defaultProps = {
  endDate: null,
};
