/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { uniq } from 'lodash';
import {
  Alert,
} from '@trussworks/react-uswds';
import ObjectiveForm from './ObjectiveForm';
import PlusButton from './PlusButton';
import GrantSelect from './GrantSelect';
import GoalDate from './GoalDate';
import {
  OBJECTIVE_DEFAULTS,
  OBJECTIVE_DEFAULT_ERRORS,
  FORM_FIELD_INDEXES,
} from './constants';
import AppLoadingContext from '../../AppLoadingContext';
import './Form.scss';
import GoalName from './GoalName';
import RTRGoalSource from './RTRGoalSource';
import FormFieldThatIsSometimesReadOnly from './FormFieldThatIsSometimesReadOnly';
import RTRGoalPrompts from './RTRGoalPrompts';

export const BEFORE_OBJECTIVES_CREATE_GOAL = 'Enter a goal before adding an objective';
export const BEFORE_OBJECTIVES_SELECT_RECIPIENTS = 'Select a grant number before adding an objective';
export default function Form({
  onSelectNudgedGoal,
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
  isCurated,
  isNew,
  status,
  datePickerKey,
  fetchError,
  goalNumbers,
  clearEmptyObjectiveError,
  onUploadFiles,
  userCanEdit,
  source,
  setSource,
  validateGoalSource,
  createdVia,
  recipient,
  regionId,
  goalTemplateId,
}) {
  const { isAppLoading } = useContext(AppLoadingContext);

  const onAddNewObjectiveClick = () => {
    // first we validate the goal text and the recipients
    if (!validateGoalNameAndRecipients([
      BEFORE_OBJECTIVES_CREATE_GOAL,
      BEFORE_OBJECTIVES_SELECT_RECIPIENTS,
    ])) {
      return;
    }

    // copy existing state, add a blank
    const obj = [...objectives.map((o) => ({ ...o })), OBJECTIVE_DEFAULTS(objectives.length)];
    setObjectiveError(obj.length - 1, OBJECTIVE_DEFAULT_ERRORS);
    setObjectives(obj);

    clearEmptyObjectiveError();
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

  const notClosedWithEditPermission = (() => (status !== 'Closed' && userCanEdit))();

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

      <GoalName
        goalName={goalName}
        goalNameError={errors[FORM_FIELD_INDEXES.NAME]}
        setGoalName={setGoalName}
        validateGoalName={validateGoalName}
        isAppLoading={isAppLoading}
        recipient={recipient}
        regionId={regionId}
        selectedGrants={selectedGrants || []}
        onSelectNudgedGoal={onSelectNudgedGoal}
        status={status}
        isOnReport={isOnReport}
        isNew={isNew}
        userCanEdit={userCanEdit}
        isCurated={isCurated}
      />

      <RTRGoalPrompts
        isCurated={isCurated || false}
        value={prompts}
        onChange={setPrompts}
        validate={validatePrompts}
        errors={errors[FORM_FIELD_INDEXES.GOAL_PROMPTS]}
        userCanEdit={notClosedWithEditPermission}
        selectedGrants={selectedGrants || []}
        goalTemplateId={goalTemplateId}
      />

      <FormFieldThatIsSometimesReadOnly
        permissions={[
          !isCurated,
          status !== 'Closed',
          createdVia !== 'tr',
        ]}
        label="Goal source"
        value={uniq(Object.values(source || {})).join(', ') || ''}
      >
        <RTRGoalSource
          source={source}
          onChangeGoalSource={setSource}
          error={errors[FORM_FIELD_INDEXES.GOAL_SOURCES]}
          isOnReport={isOnApprovedReport}
          goalStatus={status}
          userCanEdit={userCanEdit}
          validateGoalSource={validateGoalSource}
          isCurated={isCurated}
          selectedGrants={selectedGrants}
        />
      </FormFieldThatIsSometimesReadOnly>

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

      { (notClosedWithEditPermission) && (
        <div className="margin-top-4">
          {errors[FORM_FIELD_INDEXES.OBJECTIVES_EMPTY]}
          <PlusButton onClick={onAddNewObjectiveClick} text="Add new objective" />
        </div>
      )}
    </div>
  );
}

Form.propTypes = {
  onSelectNudgedGoal: PropTypes.func.isRequired,
  regionId: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]).isRequired,
  isOnReport: PropTypes.bool.isRequired,
  isOnApprovedReport: PropTypes.bool.isRequired,
  isCurated: PropTypes.bool,
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
  goalNumbers: PropTypes.oneOfType(
    [PropTypes.string, PropTypes.arrayOf(PropTypes.string)],
  ).isRequired,
  clearEmptyObjectiveError: PropTypes.func.isRequired,
  onUploadFiles: PropTypes.func.isRequired,
  validateGoalNameAndRecipients: PropTypes.func.isRequired,
  userCanEdit: PropTypes.bool,
  prompts: PropTypes.shape({
    [PropTypes.string]: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string.isRequired,
        response: PropTypes.arrayOf(PropTypes.string).isRequired,
      }),
    ),
  }).isRequired,
  setPrompts: PropTypes.func.isRequired,
  validatePrompts: PropTypes.func.isRequired,
  source: PropTypes.shape({
    [PropTypes.string]: PropTypes.string,
  }).isRequired,
  setSource: PropTypes.func.isRequired,
  validateGoalSource: PropTypes.func.isRequired,
  createdVia: PropTypes.string.isRequired,
  isNew: PropTypes.bool.isRequired,
  goalTemplateId: PropTypes.number,
};

Form.defaultProps = {
  endDate: null,
  userCanEdit: false,
  isCurated: false,
  goalTemplateId: null,
};
