/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useContext } from 'react';
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
import AppLoadingContext from '../../AppLoadingContext';
import { createObjectiveForGoal } from '../../fetchers/goals';
import './Form.scss';
import ConditionalFields from '../ConditionalFields';

export const BEFORE_OBJECTIVES_CREATE_GOAL = 'Enter a goal before adding an objective';
export const BEFORE_OBJECTIVES_SELECT_RECIPIENTS = 'Select a grant number before adding an objective';
export default function Form({
  regionId,
  possibleGrants,
  validatePrompts,
  selectedGrants,
  setSelectedGrants,
  goalName,
  prompts,
  setPrompts,
  setGoalName,
  endDate,
  setEndDate,
  errors,
  validateGoalName,
  validateEndDate,
  validateGrantNumbers,
  validateGoalNameAndRecipients,
  objectives,
  setObjectives,
  setObjectiveError,
  topicOptions,
  isOnApprovedReport,
  isOnReport,
  status,
  datePickerKey,
  fetchError,
  goalNumbers,
  clearEmptyObjectiveError,
  onUploadFiles,
  userCanEdit,
  onSaveDraft,
}) {
  const { isAppLoading } = useContext(AppLoadingContext);

  const onUpdateText = (e) => setGoalName(e.target.value);

  const saveNewObjective = async (goalIds) => {
    // save a new objective on the backend
    const newObjective = await createObjectiveForGoal(goalIds, regionId);

    // copy existing state, add a blank
    const obj = [
      ...objectives.map((o) => ({ ...o })),
      {
        ...OBJECTIVE_DEFAULTS(objectives.length),
        id: newObjective.id,
        isNew: false,
      }];

    setObjectiveError(obj.length - 1, OBJECTIVE_DEFAULT_ERRORS);
    setObjectives(obj);
    clearEmptyObjectiveError();
  };

  const onAddNewObjectiveClick = async () => {
    // first we validate the goal text and the recipients
    if (!validateGoalNameAndRecipients([
      BEFORE_OBJECTIVES_CREATE_GOAL,
      BEFORE_OBJECTIVES_SELECT_RECIPIENTS,
    ])) {
      return;
    }

    // we need to save a goal here
    // & then save new objective
    await onSaveDraft(saveNewObjective);
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

  const formTitle = goalNumbers && goalNumbers.length ? `Goal ${goalNumbers.join(', ')}` : 'Recipient TTA goal';

  const showAlert = isOnReport && status !== 'Closed';

  return (
    <div className="ttahub-create-goals-form">
      { fetchError ? <Alert type="error" role="alert">{ fetchError }</Alert> : null}
      <div className="display-flex flex-align-center margin-top-2 margin-bottom-1">
        <h2 className="margin-0">{formTitle}</h2>
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

      {
        showAlert ? (
          <Alert type="info" noIcon>
            <p className="usa-prose">This goal is used on an activity report, so some fields can&apos;t be edited.</p>
          </Alert>
        )
          : null
      }

      <h3 className="margin-top-4 margin-bottom-3">Goal summary</h3>

      <GrantSelect
        selectedGrants={selectedGrants}
        isOnReport={isOnReport}
        setSelectedGrants={setSelectedGrants}
        possibleGrants={possibleGrants}
        validateGrantNumbers={validateGrantNumbers}
        error={errors[FORM_FIELD_INDEXES.GRANTS]}
        isLoading={isAppLoading}
        goalStatus={status}
        userCanEdit={userCanEdit}
      />

      <GoalText
        error={errors[FORM_FIELD_INDEXES.NAME]}
        goalName={goalName}
        isOnReport={isOnReport}
        validateGoalName={validateGoalName}
        onUpdateText={onUpdateText}
        isLoading={isAppLoading}
        goalStatus={status}
        userCanEdit={userCanEdit}
      />

      <ConditionalFields
        isOnReport={isOnApprovedReport}
        prompts={prompts}
        setPrompts={setPrompts}
        validatePrompts={validatePrompts}
        errors={errors[FORM_FIELD_INDEXES.GOAL_PROMPTS]}
      />

      <GoalDate
        error={errors[FORM_FIELD_INDEXES.END_DATE]}
        isOnApprovedReport={isOnApprovedReport}
        setEndDate={setEndDate}
        endDate={endDate}
        validateEndDate={validateEndDate}
        key={datePickerKey}
        isLoading={isAppLoading}
        goalStatus={status}
        userCanEdit={userCanEdit}
      />

      { objectives.map((objective, i) => (
        <ObjectiveForm
          index={i}
          objective={objective}
          removeObjective={removeObjective}
          setObjectiveError={setObjectiveError}
          key={objective.id}
          // the errors object is created after the objective (in a successive render)
          // so we use the default "empty" errors as a fallback for that one render only
          // that way we don't get the white screen of death
          errors={objectiveErrors[i] || OBJECTIVE_DEFAULT_ERRORS}
          setObjective={(data) => setObjective(data, i)}
          topicOptions={topicOptions}
          onUploadFiles={onUploadFiles}
          goalStatus={status}
          userCanEdit={userCanEdit}
        />
      ))}

      { (status !== 'Closed' && userCanEdit) && (
        <div className="margin-top-4">
          {errors[FORM_FIELD_INDEXES.OBJECTIVES_EMPTY]}
          <PlusButton onClick={onAddNewObjectiveClick} text="Add new objective" />
        </div>
      )}
    </div>
  );
}

Form.propTypes = {
  isOnReport: PropTypes.bool.isRequired,
  isOnApprovedReport: PropTypes.bool.isRequired,
  errors: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.shape({}),
      PropTypes.node,
    ]),
  ).isRequired,
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
  fetchError: PropTypes.string.isRequired,
  goalNumbers: PropTypes.oneOfType([
    PropTypes.string, PropTypes.arrayOf(PropTypes.string),
  ]).isRequired,
  clearEmptyObjectiveError: PropTypes.func.isRequired,
  onUploadFiles: PropTypes.func.isRequired,
  validateGoalNameAndRecipients: PropTypes.func.isRequired,
  userCanEdit: PropTypes.bool,
  onSaveDraft: PropTypes.func.isRequired,
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  prompts: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string.isRequired,
    response: PropTypes.arrayOf(PropTypes.string).isRequired,
  })).isRequired,
  setPrompts: PropTypes.func.isRequired,
  validatePrompts: PropTypes.func.isRequired,
};

Form.defaultProps = {
  endDate: null,
  userCanEdit: false,
};
