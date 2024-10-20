import React, {
  useEffect,
  useState,
  useMemo,
  useContext,
  useRef,
} from 'react';
import moment from 'moment';
import { DECIMAL_BASE, SCOPE_IDS } from '@ttahub/common';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Link, useHistory } from 'react-router-dom';
import { Alert, Button } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import { isEqual, uniqueId } from 'lodash';
import useDeepCompareEffect from 'use-deep-compare-effect';
import Container from '../Container';
import { createOrUpdateGoals, deleteGoal, updateGoalStatus } from '../../fetchers/goals';
import { goalsByIdAndRecipient } from '../../fetchers/recipient';
import Form from './Form';
import {
  FORM_FIELD_INDEXES,
  FORM_FIELD_DEFAULT_ERRORS,
  OBJECTIVE_ERROR_MESSAGES,
  GOAL_NAME_ERROR,
  GOAL_DATE_ERROR,
  SELECT_GRANTS_ERROR,
  OBJECTIVE_DEFAULT_ERRORS,
  grantsToMultiValue,
  grantsToGoals,
} from './constants';
import ReadOnly from './ReadOnly';
import PlusButton from './PlusButton';
import colors from '../../colors';
import AppLoadingContext from '../../AppLoadingContext';
import useUrlParamState from '../../hooks/useUrlParamState';
import UserContext from '../../UserContext';
import VanillaModal from '../VanillaModal';

const [objectiveTextError] = OBJECTIVE_ERROR_MESSAGES;

export default function GoalForm({
  recipient,
  regionId,
  showRTRnavigation,
  isNew,
}) {
  const unsuspendModalRef = useRef(null);
  const openExistingGoalModalRef = useRef(null);
  const history = useHistory();
  const possibleGrants = recipient.grants.filter(((g) => g.status === 'Active'));

  const goalDefaults = useMemo(() => ({
    name: '',
    endDate: null,
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
  }), [possibleGrants]);

  const [showForm, setShowForm] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [fetchAttempted, setFetchAttempted] = useState(false);

  // this will store our created goals (vs the goal that's occupying the form at present)
  const [createdGoals, setCreatedGoals] = useState([]);
  const [goalName, setGoalName] = useState(goalDefaults.name);
  const [endDate, setEndDate] = useState(goalDefaults.endDate);
  const [prompts, setPrompts] = useState(
    grantsToMultiValue(goalDefaults.grants, goalDefaults.prompts, []),
  );
  const [source, setSource] = useState(grantsToMultiValue(goalDefaults.grants));
  const [createdVia, setCreatedVia] = useState('');
  const [isCurated, setIsCurated] = useState(goalDefaults.isCurated);
  const [goalTemplateId, setGoalTemplateId] = useState(goalDefaults.goalTemplateId);
  const [selectedGrants, setSelectedGrants] = useState(goalDefaults.grants);
  const [goalOnApprovedAR, setGoalOnApprovedReport] = useState(goalDefaults.onApprovedAR);
  const [goalOnAR, setGoalonAR] = useState(goalDefaults.onAR);
  const [nudgedGoalSelection, setNudgedGoalSelection] = useState({});
  const [isReopenedGoal, setIsReopenedGoal] = useState(goalDefaults.isReopenedGoal);
  // we need to set this key to get the component to re-render (uncontrolled input)
  const [datePickerKey, setDatePickerKey] = useState('DPK-00');
  const [status, setStatus] = useState(goalDefaults.status);
  const [objectives, setObjectives] = useState(goalDefaults.objectives);
  const [alert, setAlert] = useState({ message: '', type: 'success' });
  const [goalNumbers, setGoalNumbers] = useState('');
  const [goalCollaborators, setGoalCollaborators] = useState([]);
  const [errors, setErrors] = useState(FORM_FIELD_DEFAULT_ERRORS);

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

  const canEdit = useMemo(() => user.permissions.filter(
    (permission) => permission.regionId === parseInt(regionId, DECIMAL_BASE)
      && (
        permission.scopeId === SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS
        || permission.scopeId === SCOPE_IDS.APPROVE_ACTIVITY_REPORTS
      ),
  ).length > 0, [regionId, user.permissions]);

  // we can access the params as the third arg returned by useUrlParamState
  // (if we need it)
  const [ids, setIds] = useUrlParamState('id[]');

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
        setEndDate(goal.endDate);
        setDatePickerKey(goal.endDate ? `DPK-${goal.endDate}` : '00');
        setPrompts(grantsToMultiValue(selectedGoalGrants, goal.prompts, []));
        setSelectedGrants(selectedGoalGrants);
        setGoalNumbers(goal.goalNumbers);
        setGoalOnApprovedReport(goal.onApprovedAR);
        setGoalonAR(goal.onAR);
        setIsCurated(goal.isCurated);
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

    if (!fetchAttempted && !isNew && !isAppLoading) {
      setAppLoadingText('Loading goal');
      setIsAppLoading(true);
      fetchGoal();
    }
  }, [
    errors,
    fetchAttempted,
    recipient.id,
    isNew,
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
   *
   * @returns bool
   */
  const validateGoalName = (message = GOAL_NAME_ERROR) => {
    let error = <></>;

    if (!goalName || !goalName.trim()) {
      error = <span className="usa-error-message">{message}</span>;
    }

    const newErrors = [...errors];
    newErrors.splice(FORM_FIELD_INDEXES.NAME, 1, error);
    setErrors(newErrors);

    return !error.props.children;
  };

  /**
   * @returns bool
   */

  const validateGoalSource = () => {
    let error = <></>;

    const newErrors = [...errors];

    if (!source) {
      error = <span className="usa-error-message">Select a goal source</span>;
    }

    newErrors.splice(FORM_FIELD_INDEXES.GOAL_SOURCES, 1, error);
    setErrors(newErrors);

    return !error.props.children;
  };

  /**
   *
   * @returns bool
   */
  const validateEndDate = () => {
    let error = <></>;

    if (endDate && !moment(endDate, 'MM/DD/YYYY').isValid()) {
      error = <span className="usa-error-message">{GOAL_DATE_ERROR}</span>;
    }

    const newErrors = [...errors];
    newErrors.splice(FORM_FIELD_INDEXES.END_DATE, 1, error);
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
    && validateGoalName()
    && validateEndDate()
    && validateObjectives()
    && validateAllPrompts()
  );
  const isValidDraft = () => (
    validateGrantNumbers()
    && validateGoalName()
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
          endDate: goal.endDate,
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
          endDate,
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
    setEndDate(goalDefaults.endDate);
    setStatus(goalDefaults.status);
    setSelectedGrants(goalDefaults.grants);
    setIsCurated(goalDefaults.isCurated);
    setPrompts(goalDefaults.prompts);
    setSource(goalDefaults.source);
    setCreatedVia(goalDefaults.createdVia);
    setShowForm(false);
    setObjectives([]);
    setDatePickerKey('DPK-00');
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
        endDate,
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
            endDate: goal.endDate,
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
    setEndDate(goal.endDate);
    setStatus(goal.status);
    setGoalNumbers(goal.goalNumbers);
    setSelectedGrants(goal.grants);
    setIsCurated(goal.isCurated);
    setPrompts(goal.prompts);
    setSource(goal.source);
    setCreatedVia(goal.createdVia);
    setIds(goal.ids);

    // we need to update the date key so it re-renders all the
    // date pickers, as they are uncontrolled inputs
    // PS - endDate can be null
    setDatePickerKey(goal.endDate ? `DPK-${goal.endDate}` : '00');
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

  const forwardToGoalWithIds = (goalIds) => {
    const urlFragment = `id[]=${goalIds.join(',')}`;
    const url = `/recipient-tta-records/${recipient.id}/region/${parseInt(regionId, DECIMAL_BASE)}/goals?${urlFragment}`;
    history.push(url);
  };

  const onSelectNudgedGoal = async (goal) => {
    const onSelectInitiativeGoal = async () => {
      setIsAppLoading(true);
      const goals = selectedGrants.map((g) => ({
        grantId: g.id,
        name: goal.name,
        status: goal.status,
        prompts: [],
        isCurated: true,
        endDate: '',
        regionId: parseInt(regionId, DECIMAL_BASE),
        recipientId: recipient.id,
        objectives: [],
        source: goal.source,
        goalTemplateId: goal.id,
      }));
      const created = await createOrUpdateGoals(goals);
      setAppLoadingText('loading');
      forwardToGoalWithIds(created.map((g) => g.goalIds).flat());
    };

    try {
      setAppLoadingText('loading existing goal');
      setNudgedGoalSelection(goal);

      if (goal.status === 'Suspended') {
        unsuspendModalRef.current.toggleModal();
        return;
      }

      if (goal.isCurated) {
      // we need to do a little magic here to get the goal
        setAppLoadingText('creating new ohs initiative goal');
        await onSelectInitiativeGoal();
        return;
      }

      openExistingGoalModalRef.current.toggleModal();
    } catch (err) {
      setAlert({
        message: 'There was an error selecting your goal',
        type: 'error',
      });
    } finally {
      setIsAppLoading(false);
      setAppLoadingText('Loading');
    }
  };

  const unsuspender = async () => {
    try {
      setAppLoadingText('Reactivating goal');
      setIsAppLoading(true);
      const updatedGoals = await updateGoalStatus(
        nudgedGoalSelection.ids,
        'In Progress',
        'Suspended',
        null,
        null,
      );

      forwardToGoalWithIds(updatedGoals.map((g) => g.id));
    } catch (err) {
      setAlert({
        message: 'There was an error unsuspending your goal',
        type: 'error',
      });
    } finally {
      setIsAppLoading(false);
      setAppLoadingText('Loading');
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
      { showRTRnavigation ? (
        <Link
          className="ttahub-recipient-record--tabs_back-to-search margin-left-2 margin-top-4 margin-bottom-3 display-inline-block"
          to={`/recipient-tta-records/${recipient.id}/region/${regionId}/rttapa/`}
        >
          <FontAwesomeIcon className="margin-right-1" color={colors.ttahubMediumBlue} icon={faArrowLeft} />
          <span>Back to RTTAPA</span>
        </Link>
      ) : null }
      <h1 className="page-heading margin-top-0 margin-bottom-0 margin-left-2">
        TTA Goals for
        {' '}
        {recipient.name}
        {' '}
        - Region
        {' '}
        {regionId}
      </h1>

      <Container className="margin-y-3 margin-left-2 width-tablet" paddingX={4} paddingY={5}>
        { createdGoalsForReadOnly.length ? (
          <>
            <ReadOnly
              createdGoals={createdGoalsForReadOnly}
              onRemove={onRemove}
              onEdit={onEdit}
            />
            <div className="margin-bottom-4">
              {!showForm && isNew
                ? (
                  <PlusButton onClick={() => setShowForm(true)} text="Add another goal" />
                ) : null }
            </div>
          </>
        ) : null }
        <VanillaModal
          forceAction
          id="reopen-suspended-goal"
          heading="This goal is currently suspended"
          modalRef={unsuspendModalRef}
        >
          <p className="usa-prose">The reason for suspending the goal was:</p>
          <ul className="usa-list">
            {(nudgedGoalSelection.closeSuspendReasons || []).map((reason) => (
              <li key={uniqueId('nudged-goalclose-suspend-reason-')}>{reason}</li>
            ))}
          </ul>
          <p className="usa-prose">Would you like to reopen this goal and change the status to In progress?</p>
          <Button
            type="button"
            onClick={async () => {
              await unsuspender();
              unsuspendModalRef.current.toggleModal();
            }}
          >
            Yes, reopen
          </Button>
          <button type="button" id="unsuspend" onClick={() => unsuspendModalRef.current.toggleModal()} className="usa-button usa-button--subtle">No, create a new goal</button>
        </VanillaModal>
        <VanillaModal
          forceAction
          id="switch-to-existing-goal"
          heading="You are selecting an existing goal."
          modalRef={openExistingGoalModalRef}
        >
          <p className="usa-prose">Do you want to edit this goal?</p>
          <p className="usa-prose">Information entered here will be lost when choosing an existing goal.</p>
          <Button
            type="button"
            onClick={async () => {
              forwardToGoalWithIds(nudgedGoalSelection.ids);
              openExistingGoalModalRef.current.toggleModal();
            }}
          >
            Yes, edit
          </Button>
          <button type="button" id="openExisting" onClick={() => openExistingGoalModalRef.current.toggleModal()} className="usa-button usa-button--subtle">No, create a new goal</button>
        </VanillaModal>
        <form onSubmit={onSubmit}>
          { showForm && (
            <Form
              isNew={isNew}
              onSelectNudgedGoal={onSelectNudgedGoal}
              fetchError={fetchError}
              onSaveDraft={onSaveDraft}
              possibleGrants={possibleGrants}
              selectedGrants={selectedGrants}
              setSelectedGrants={setSelectedGrants}
              goalName={goalName}
              prompts={prompts}
              setPrompts={setPrompts}
              setGoalName={setGoalName}
              recipient={recipient}
              regionId={regionId}
              endDate={endDate}
              setEndDate={setEndDate}
              datePickerKey={datePickerKey}
              errors={errors}
              validateGoalName={validateGoalName}
              validateEndDate={validateEndDate}
              validateGrantNumbers={validateGrantNumbers}
              validateGoalNameAndRecipients={validateGoalNameAndRecipients}
              objectives={objectives}
              setObjectives={setObjectives}
              setObjectiveError={setObjectiveError}
              clearEmptyObjectiveError={clearEmptyObjectiveError}
              isOnReport={goalOnAR}
              isOnApprovedReport={goalOnApprovedAR}
              isCurated={isCurated}
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

          { canEdit && (isNew || status === 'Draft') && status !== 'Closed' && (
          <div className="margin-top-4">
            { !showForm ? <Button type="submit">Submit goal</Button> : null }
            { showForm ? <Button type="button" onClick={() => onSaveAndContinue(false)}>Save and continue</Button> : null }
            { showForm ? <Button type="button" outline onClick={onSaveDraft}>Save draft</Button> : null }
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

          { canEdit && (!isNew && status !== 'Draft') && status !== 'Closed' && (
            <div className="margin-top-4">
              <Button
                type="submit"
                onClick={async (e) => {
                  e.preventDefault();
                  await onSaveAndContinue(true);
                }}
              >
                Save
              </Button>
              <Link
                className="usa-button usa-button--outline"
                to={`/recipient-tta-records/${recipient.id}/region/${regionId}/rttapa/`}
              >
                Cancel
              </Link>
            </div>
          ) }

          { alert.message ? <Alert role="alert" className="margin-y-2" type={alert.type}>{alert.message}</Alert> : null }
        </form>
      </Container>
    </>
  );
}

GoalForm.propTypes = {
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
  showRTRnavigation: PropTypes.bool,
  isNew: PropTypes.bool,
};

GoalForm.defaultProps = {
  showRTRnavigation: false,
  isNew: false,
};
