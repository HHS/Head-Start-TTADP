import React, {
  useEffect,
  useState,
  useMemo,
  useContext,
} from 'react';
import moment from 'moment';
import { DECIMAL_BASE } from '@ttahub/common';
import { Link, useHistory } from 'react-router-dom';
import { Alert, Button } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import { isEqual } from 'lodash';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { createOrUpdateGoals, deleteGoal } from '../../fetchers/goals';
import { goalsByIdAndRecipient } from '../../fetchers/recipient';
import Form from './Form';
import {
  FORM_FIELD_INDEXES,
  FORM_FIELD_DEFAULT_ERRORS,
  OBJECTIVE_ERROR_MESSAGES,
  GOAL_NAME_ERROR,
  SELECT_GRANTS_ERROR,
  OBJECTIVE_DEFAULT_ERRORS,
  grantsToMultiValue,
  grantsToGoals,
} from './constants';
import ReadOnly from './ReadOnly';
import AppLoadingContext from '../../AppLoadingContext';
import UserContext from '../../UserContext';
import GoalFormHeading from '../SharedGoalComponents/GoalFormHeading';
import GoalFormNavigationLink from '../SharedGoalComponents/GoalFormNavigationLink';
import GoalFormButton from '../SharedGoalComponents/GoalFormButton';
import { GOAL_FORM_BUTTON_TYPES, GOAL_FORM_BUTTON_VARIANTS } from '../SharedGoalComponents/constants';
import { canEditOrCreateGoals } from '../../permissions';
import GoalFormContainer from '../SharedGoalComponents/GoalFormContainer';

const [objectiveTextError] = OBJECTIVE_ERROR_MESSAGES;

// TODO: This file can be deleted when we switch over to standard goals
// (as well as files linked to this, too numerous to list here)

export default function GoalForm({
  recipient,
  regionId,
  goalIds,
}) {
  const history = useHistory();
  const possibleGrants = recipient.grants.filter(((g) => g.status === 'Active'));

  const goalDefaults = useMemo(() => ({
    name: '',
    status: 'Draft',
    grants: possibleGrants.length === 1 ? [possibleGrants[0]] : [],
    objectives: [],
    id: 'new',
    onApprovedAR: false,
    onAR: false,
    prompts: {},
    isCurated: false,
    source: {},
    createdVia: '',
    goalTemplateId: null,
    isReopenedGoal: false,
    isSourceEditable: true,
  }), [possibleGrants]);

  const [showForm, setShowForm] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [fetchAttempted, setFetchAttempted] = useState(false);

  // this will store our created goals (vs the goal that's occupying the form at present)
  const [createdGoals, setCreatedGoals] = useState([]);
  const [goalName, setGoalName] = useState(goalDefaults.name);
  const [prompts, setPrompts] = useState(
    grantsToMultiValue(goalDefaults.grants, goalDefaults.prompts, []),
  );
  const [source, setSource] = useState(grantsToMultiValue(goalDefaults.grants));
  const [createdVia, setCreatedVia] = useState('');
  const [isCurated, setIsCurated] = useState(goalDefaults.isCurated);
  const [isSourceEditable, setIsSourceEditable] = useState(goalDefaults.isSourceEditable);
  const [goalTemplateId, setGoalTemplateId] = useState(goalDefaults.goalTemplateId);
  const [selectedGrants, setSelectedGrants] = useState(goalDefaults.grants);
  const [goalOnApprovedAR, setGoalOnApprovedReport] = useState(goalDefaults.onApprovedAR);
  const [goalOnAR, setGoalonAR] = useState(goalDefaults.onAR);
  const [isReopenedGoal, setIsReopenedGoal] = useState(goalDefaults.isReopenedGoal);
  // we need to set this key to get the component to re-render (uncontrolled input)
  const [status, setStatus] = useState(goalDefaults.status);
  const [objectives, setObjectives] = useState(goalDefaults.objectives);
  const [alert, setAlert] = useState({ message: '', type: 'success' });
  const [goalNumbers, setGoalNumbers] = useState('');
  const [goalCollaborators, setGoalCollaborators] = useState([]);
  const [errors, setErrors] = useState(FORM_FIELD_DEFAULT_ERRORS);
  const [ids, setIds] = useState(goalIds || []);

  useDeepCompareEffect(() => {
    const newPrompts = grantsToMultiValue(selectedGrants, { ...prompts });
    if ((!isEqual(newPrompts, prompts))) {
      setPrompts(newPrompts);
    }
  }, [prompts, selectedGrants]);

  useDeepCompareEffect(() => {
    const newSource = grantsToMultiValue(selectedGrants, { ...source });
    if ((!isEqual(newSource, source))) {
      setSource(newSource);
    }
  }, [selectedGrants, source]);

  const { isAppLoading, setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext);
  const { user } = useContext(UserContext);

  const canView = useMemo(() => user.permissions.filter(
    (permission) => permission.regionId === parseInt(regionId, DECIMAL_BASE),
  ).length > 0, [regionId, user.permissions]);

  // eslint-disable-next-line max-len
  const canEdit = useMemo(() => canEditOrCreateGoals(user, parseInt(regionId, DECIMAL_BASE)), [regionId, user]);

  // for fetching goal data from api if it exists
  useEffect(() => {
    async function fetchGoal() {
      setFetchAttempted(true); // as to only fetch once
      try {
        let goal = null;
        try {
          [goal] = await goalsByIdAndRecipient(
            ids, recipient.id.toString(),
          );
        } catch (err) {
          history.push(`/something-went-wrong/${err.status}`);
        }

        const selectedGoalGrants = goal.grants ? goal.grants : [goal.grant];

        // for these, the API sends us back things in a format we expect
        setGoalName(goal.name);
        setStatus(goal.status);
        setPrompts(grantsToMultiValue(selectedGoalGrants, goal.prompts, []));
        setSelectedGrants(selectedGoalGrants);
        setGoalNumbers(goal.goalNumbers);
        setGoalOnApprovedReport(goal.onApprovedAR);
        setGoalonAR(goal.onAR);
        setIsCurated(goal.isCurated);
        setIsSourceEditable(goal.isSourceEditable);
        setGoalTemplateId(goal.goalTemplateId);
        setSource(grantsToMultiValue(selectedGoalGrants, goal.source, ''));
        setCreatedVia(goal.createdVia || '');
        setGoalCollaborators(goal.collaborators || []);
        setIsReopenedGoal(goal.isReopenedGoal || false);

        // this is a lot of work to avoid two loops through the goal.objectives
        // but I'm sure you'll agree its totally worth it
        const [
          newObjectives, // return objectives w/ resources and topics formatted as expected
          objectiveErrors, // and we need a matching error for each objective
        ] = goal.objectives.reduce((previous, objective) => {
          const [newObjs, objErrors] = previous;
          const newObjective = objective;

          newObjs.push(newObjective);
          // this is the format of an objective error
          // three JSX nodes representing each of three possible errors
          objErrors.push(OBJECTIVE_DEFAULT_ERRORS);

          return [newObjs, objErrors];
        }, [[], []]);

        const newErrors = [...errors];
        newErrors.splice(FORM_FIELD_INDEXES.OBJECTIVES, 1, objectiveErrors);
        setErrors(newErrors);

        setObjectives(newObjectives);
      } catch (err) {
        setFetchError('There was an error loading your goal');
      } finally {
        setIsAppLoading(false);
      }
    }

    if (!fetchAttempted && !isAppLoading) {
      setAppLoadingText('Loading goal');
      setIsAppLoading(true);
      fetchGoal();
    }
  }, [
    errors,
    fetchAttempted,
    recipient.id,
    isAppLoading,
    ids,
    setAppLoadingText,
    setIsAppLoading,
    history,
  ]);

  const setObjectiveError = (objectiveIndex, errorText) => {
    const newErrors = [...errors];
    const objectiveErrors = [...newErrors[FORM_FIELD_INDEXES.OBJECTIVES]];
    objectiveErrors.splice(objectiveIndex, 1, errorText);
    newErrors.splice(FORM_FIELD_INDEXES.OBJECTIVES, 1, objectiveErrors);
    setErrors(newErrors);
  };

  // form field validation functions

  /** @returns bool */
  const validateGoalNameAndRecipients = (messages = [
    GOAL_NAME_ERROR,
    SELECT_GRANTS_ERROR,
  ]) => {
    let validName = true;
    let validRecipients = true;

    if (!goalName) {
      validName = false;
    }

    if (!selectedGrants.length) {
      validRecipients = false;
    }

    const newErrors = [...errors];
    if (!validName) {
      newErrors.splice(FORM_FIELD_INDEXES.NAME, 1, <span className="usa-error-message">{messages[0]}</span>);
    }

    if (!validRecipients) {
      newErrors.splice(FORM_FIELD_INDEXES.GRANTS, 1, <span className="usa-error-message">{messages[1]}</span>);
    }

    setErrors(newErrors);

    return validName && validRecipients;
  };

  /**
   * @returns bool
   */

  const validateGoalSource = () => {
    let error = <></>;

    const newErrors = [...errors];

    const validSource = Object.values(source).every((s) => Boolean(s));

    if (!validSource) {
      error = <span className="usa-error-message">Select a goal source</span>;
    }

    newErrors.splice(FORM_FIELD_INDEXES.GOAL_SOURCES, 1, error);
    setErrors(newErrors);

    return !error.props.children;
  };

  const validateGrantNumbers = (message = SELECT_GRANTS_ERROR) => {
    let error = <></>;
    if (!selectedGrants.length) {
      error = <span className="usa-error-message">{message}</span>;
    }
    const newErrors = [...errors];
    newErrors.splice(FORM_FIELD_INDEXES.GRANTS, 1, error);
    setErrors(newErrors);

    return !error.props.children;
  };

  const validatePrompts = (title, isErrored, errorMessage) => {
    let error = <></>;
    const promptErrors = { ...errors[FORM_FIELD_INDEXES.GOAL_PROMPTS] };

    if (isErrored) {
      error = <span className="usa-error-message">{errorMessage}</span>;
    }

    const newErrors = [...errors];
    promptErrors[title] = error;
    newErrors.splice(FORM_FIELD_INDEXES.GOAL_PROMPTS, 1, promptErrors);
    setErrors(newErrors);
    return !error.props.children;
  };

  const validateAllPrompts = () => {
    const promptErrors = { ...errors[FORM_FIELD_INDEXES.GOAL_PROMPTS] };
    return Object.keys(promptErrors).every((key) => !promptErrors[key].props.children);
  };

  /**
   *
   * @returns bool
   */
  const validateObjectives = () => {
    if (!objectives.length) {
      return true;
    }

    const newErrors = [...errors];
    let isValid = true;

    const newObjectiveErrors = objectives.map((objective) => {
      if (!objective.title) {
        isValid = false;
        return [
          <span className="usa-error-message">{objectiveTextError}</span>,
          <></>,
          <></>,
          <></>,
          <></>,
          <></>,
        ];
      }

      return [
        ...OBJECTIVE_DEFAULT_ERRORS,
      ];
    });

    newErrors.splice(FORM_FIELD_INDEXES.OBJECTIVES, 1, newObjectiveErrors);
    setErrors(newErrors);

    return isValid;
  };

  const clearEmptyObjectiveError = () => {
    const error = <></>;
    const newErrors = [...errors];
    newErrors.splice(FORM_FIELD_INDEXES.OBJECTIVES_EMPTY, 1, error);
    setErrors(newErrors);
  };

  // quick shorthands to check to see if our fields are good to save to the different states
  // (different validations for not started and draft)
  const isValidNotStarted = () => (
    validateGrantNumbers()
    && validateGoalSource()
    && validateObjectives()
    && validateAllPrompts()
  );
  const isValidDraft = () => (
    validateGrantNumbers()
  );

  const updateObjectives = (updatedObjectives) => {
    // when we set a new set of objectives
    // an error object for each objective.
    const newErrors = [...errors];
    const objectiveErrors = updatedObjectives.map(() => OBJECTIVE_DEFAULT_ERRORS);

    newErrors.splice(FORM_FIELD_INDEXES.OBJECTIVES, 1, objectiveErrors);
    setErrors(newErrors);
    setObjectives(updatedObjectives);
  };

  const redirectToGoalsPage = (goals) => {
    history.push(`/recipient-tta-records/${recipient.id}/region/${parseInt(regionId, DECIMAL_BASE)}/rttapa`, {
      ids: goals.map((g) => g.id),
    });
  };

  /**
   * button click handlers
   */

  // on form submit
  const onSubmit = async (e) => {
    e.preventDefault();
    setAppLoadingText('Submitting');
    setAlert({ message: '', type: 'success' });
    setIsAppLoading(true);
    try {
      // if the goal is a draft, submission should move it to "not started"
      const gs = createdGoals.reduce((acc, goal) => {
        const statusToSave = goal.status && goal.status === 'Draft' ? 'Not Started' : goal.status;
        const newGoals = grantsToGoals({
          ids: goal.ids,
          selectedGrants: goal.grants,
          name: goal.name,
          status: statusToSave,
          source: goal.source,
          isCurated: goal.isCurated,
          regionId: parseInt(regionId, DECIMAL_BASE),
          recipient,
          objectives: goal.objectives,
          prompts: goal.prompts,
        });

        return [...acc, ...newGoals];
      }, []);

      const goals = await createOrUpdateGoals(gs);

      // on success, redirect back to RTR Goals & Objectives page
      // once integrated into the AR, this will probably have to be turned into a prop function
      // that gets called on success
      redirectToGoalsPage(goals);
    } catch (err) {
      setAlert({
        message: 'There was an error saving your goal',
        type: 'error',
      });
    } finally {
      setIsAppLoading(false);
    }
  };

  const onSaveDraft = async () => {
    if (!isValidDraft()) {
      // attempt to focus on the first invalid field
      const invalid = document.querySelector('.usa-form :invalid:not(fieldset), .usa-form-group--error textarea, .usa-form-group--error input, .usa-error-message + .ttahub-resource-repeater input');
      if (invalid) {
        invalid.focus();
      }
      return;
    }
    setAppLoadingText('Saving');
    setIsAppLoading(true);

    try {
      let newGoals = [];

      if (showForm) {
        newGoals = grantsToGoals({
          selectedGrants,
          name: goalName,
          status,
          source,
          isCurated,
          regionId,
          recipient,
          objectives,
          ids,
          prompts,
        });
      }

      const mappedCreatedGoals = createdGoals.map((goal) => goal.grantIds.map((grantId) => ({
        grantId,
        ...goal,
      }))).flat();

      const goals = [
        ...mappedCreatedGoals,
        ...newGoals,
      ];

      const updatedGoals = await createOrUpdateGoals(goals);

      // this find will only ever 1 goal
      // representing the goal being edited
      // we search the new goals and get the one that wasn't in the existing created goals
      // (only one goal can be edited at a time, and even multi grant goals
      // are deduplicated on the backend)
      const existingIds = createdGoals.map((g) => g.id);
      const goalForEditing = updatedGoals.find((goal) => {
        const { id } = goal;
        return !existingIds.includes(id);
      });

      const updatedObjectives = goalForEditing
        && goalForEditing.objectives ? goalForEditing.objectives : [];

      updateObjectives(updatedObjectives);

      setAlert({
        message: `Your goal was last saved at ${moment().format('MM/DD/YYYY [at] h:mm a')}`,
        type: 'success',
      });

      const newIds = updatedGoals.flatMap((g) => g.goalIds);
      setIds(newIds);
    } catch (error) {
      setAlert({
        message: 'There was an error saving your goal',
        type: 'error',
      });
    } finally {
      setIsAppLoading(false);
    }
  };

  const clearForm = () => {
    // clear our form fields
    setGoalName(goalDefaults.name);
    setStatus(goalDefaults.status);
    setSelectedGrants(goalDefaults.grants);
    setIsCurated(goalDefaults.isCurated);
    setPrompts(goalDefaults.prompts);
    setSource(goalDefaults.source);
    setCreatedVia(goalDefaults.createdVia);
    setShowForm(false);
    setObjectives([]);
  };

  const onSaveAndContinue = async (redirect = false) => {
    setAlert({ message: '', type: 'success' });
    if (!isValidNotStarted()) {
      // attempt to focus on the first invalid field
      const invalid = document.querySelector('.usa-form :invalid:not(fieldset), .usa-form-group--error textarea, .usa-form-group--error input, .usa-error-message + .ttahub-resource-repeater input');
      if (invalid) {
        invalid.focus();
      }
      return;
    }

    setAppLoadingText('Saving');
    setIsAppLoading(true);
    try {
      const newGoals = grantsToGoals({
        selectedGrants,
        name: goalName,
        status,
        source,
        isCurated,
        regionId,
        recipient,
        objectives,
        ids,
        prompts,
      });

      const goals = [
        ...createdGoals.reduce((acc, goal) => {
          const g = grantsToGoals({
            selectedGrants: goal.grants,
            name: goal.name,
            status: goal.status,
            source: goal.source,
            isCurated: goal.isCurated,
            prompts: goal.prompts,
            regionId: parseInt(regionId, DECIMAL_BASE),
            recipient,
            objectives,
            ids: [],
          });
          return [...acc, ...g];
        }, []),
        ...newGoals,
      ];

      const newCreatedGoals = await createOrUpdateGoals(goals);

      setCreatedGoals(newCreatedGoals.map((goal) => ({
        ...goal,
        ids: goal.goalIds,
        grants: goal.grants,
        objectives: goal.objectives,
      })));

      if (redirect) {
        redirectToGoalsPage(newCreatedGoals);
      }

      clearForm();

      setAlert({
        message: `Your goal was last saved at ${moment().format('MM/DD/YYYY [at] h:mm a')}`,
        type: 'success',
      });
    } catch (error) {
      setAlert({
        message: 'There was an error saving your goal',
        type: 'error',
      });
    } finally {
      setIsAppLoading(false);
    }
  };

  const onEdit = (goal, index) => {
    // move from "created goals" to the form

    // first remove from the createdGoals array
    const newCreatedGoals = createdGoals.map((g) => ({ ...g }));
    newCreatedGoals.splice(index, 1);
    setCreatedGoals(newCreatedGoals);

    // then repopulate the form
    setGoalName(goal.name);

    setStatus(goal.status);
    setGoalNumbers(goal.goalNumbers);
    setSelectedGrants(goal.grants);
    setIsCurated(goal.isCurated);
    setIsSourceEditable(goal.isSourceEditable);
    setPrompts(goal.prompts);
    setSource(goal.source);
    setCreatedVia(goal.createdVia);
    setIds(goal.ids);
    setObjectives(goal.objectives);
    setShowForm(true);
  };

  /**
   * takes a goal id and attempts to delete it via
   * HTTP
   * @param {Number} g
   */
  const onRemove = async (g) => {
    setAppLoadingText('Removing goal');
    setIsAppLoading(true);
    try {
      const success = await deleteGoal(g.goalIds, regionId);

      if (success) {
        const newGoals = createdGoals.filter((goal) => goal.id !== g.id);
        setCreatedGoals(newGoals);
        if (!newGoals.length) {
          setShowForm(true);
        }

        setAlert({
          message: '',
          type: 'success',
        });
      }
    } catch (err) {
      setAlert({
        message: 'There was an error deleting your goal',
        type: 'error',
      });
    } finally {
      setIsAppLoading(false);
    }
  };

  if (!canView) {
    return (
      <Alert role="alert" className="margin-y-2" type="error">
        You don&apos;t have permission to view this page
      </Alert>
    );
  }
  const createdGoalsForReadOnly = createdGoals.map((goal) => {
    const { objectives: goalObjectives } = goal;
    const newObjectives = goalObjectives.map((obj) => {
      const copy = { ...obj };
      delete copy.status;
      return copy;
    });

    return {
      ...goal,
      objectives: newObjectives,
    };
  });

  return (
    <>
      <GoalFormNavigationLink recipient={recipient} regionId={regionId} />
      <GoalFormHeading recipient={recipient} regionId={regionId} />
      <GoalFormContainer>
        { createdGoalsForReadOnly.length ? (
          <ReadOnly
            createdGoals={createdGoalsForReadOnly}
            onRemove={onRemove}
            onEdit={onEdit}
          />
        ) : null }
        <form onSubmit={onSubmit}>
          { showForm && (
            <Form
              fetchError={fetchError}
              onSaveDraft={onSaveDraft}
              possibleGrants={possibleGrants}
              selectedGrants={selectedGrants}
              setSelectedGrants={setSelectedGrants}
              goalName={goalName}
              prompts={prompts}
              setPrompts={setPrompts}
              errors={errors}
              validateGrantNumbers={validateGrantNumbers}
              validateGoalNameAndRecipients={validateGoalNameAndRecipients}
              objectives={objectives}
              setObjectives={setObjectives}
              setObjectiveError={setObjectiveError}
              clearEmptyObjectiveError={clearEmptyObjectiveError}
              isOnReport={goalOnAR}
              isOnApprovedReport={goalOnApprovedAR}
              isCurated={isCurated}
              isSourceEditable={isSourceEditable}
              status={status || 'Needs status'}
              goalNumbers={goalNumbers}
              userCanEdit={canEdit}
              validatePrompts={validatePrompts}
              source={source}
              setSource={setSource}
              validateGoalSource={validateGoalSource}
              createdVia={createdVia}
              collaborators={goalCollaborators}
              goalTemplateId={goalTemplateId}
              isReopenedGoal={isReopenedGoal}
            />
          )}

          { canEdit && status === 'Draft' && status !== 'Closed' && (
          <div className="margin-top-4">
            { !showForm ? <Button type="submit">Submit goal</Button> : null }
            { showForm ? <Button type="button" onClick={() => onSaveAndContinue(false)}>Save and continue</Button> : null }
            { showForm ? (
              <Link
                to={`/recipient-tta-records/${recipient.id}/region/${regionId}/goals?id[]=${ids.join('&id[]=')}`}
                className=" usa-button usa-button--outline"
              >
                Back
              </Link>
            ) : null }
            { showForm && !createdGoals.length ? (
              <Link
                to={`/recipient-tta-records/${recipient.id}/region/${regionId}/rttapa/`}
                className=" usa-button usa-button--outline"
              >
                Cancel
              </Link>
            ) : null }
            { showForm && createdGoals.length ? (
              <Button type="button" outline onClick={clearForm} data-testid="create-goal-form-cancel">Cancel</Button>
            ) : null }
          </div>
          )}

          { canEdit && status !== 'Draft' && status !== 'Closed' && (
            <div className="margin-top-4">
              <GoalFormButton
                type={GOAL_FORM_BUTTON_TYPES.SUBMIT}
                label="Save"
                onClick={async (e) => {
                  e.preventDefault();
                  await onSaveAndContinue(true);
                }}
              />
              <GoalFormButton
                type={GOAL_FORM_BUTTON_TYPES.LINK}
                to={`/recipient-tta-records/${recipient.id}/region/${regionId}/rttapa/`}
                variant={GOAL_FORM_BUTTON_VARIANTS.OUTLINE}
                label="Cancel"
              />
            </div>
          ) }

          { alert.message ? <Alert role="alert" className="margin-y-2" type={alert.type}>{alert.message}</Alert> : null }
        </form>
      </GoalFormContainer>
    </>
  );
}

GoalForm.propTypes = {
  goalIds: PropTypes.arrayOf(PropTypes.number),
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
  regionId: PropTypes.string.isRequired,
};

GoalForm.defaultProps = {
  goalIds: [],
};
