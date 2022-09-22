import React, {
  useEffect, useState, useMemo,
} from 'react';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Link, useHistory } from 'react-router-dom';
import { Alert, Button } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import Container from '../Container';
import { createOrUpdateGoals, deleteGoal, goalByIdAndRecipient } from '../../fetchers/goals';
import { uploadObjectivesFile } from '../../fetchers/File';
import { getTopics } from '../../fetchers/topics';
import { getRoles } from '../../fetchers/roles';
import Form from './Form';
import {
  FORM_FIELD_INDEXES,
  FORM_FIELD_DEFAULT_ERRORS,
  validateListOfResources,
  OBJECTIVE_ERROR_MESSAGES,
  GOAL_NAME_ERROR,
  GOAL_DATE_ERROR,
  SELECT_GRANTS_ERROR,
  OBJECTIVE_DEFAULT_ERRORS,
} from './constants';
import { DECIMAL_BASE } from '../../Constants';
import ReadOnly from './ReadOnly';
import PlusButton from './PlusButton';
import colors from '../../colors';
import GoalFormLoadingContext from '../../GoalFormLoadingContext';

const [
  objectiveTextError,
  objectiveTopicsError,
  objectiveResourcesError,,
  objectiveStatusError,
] = OBJECTIVE_ERROR_MESSAGES;

const formatGrantsFromApi = (grants) => grants
  .map((grant) => {
    const programTypes = grant.programs.map(({ programType }) => programType).join(', ');
    return {
      value: grant.id,
      label: `${grant.number} - ${programTypes}`,
      id: grant.id,
    };
  });

export default function GoalForm({
  recipient,
  regionId,
  id,
  showRTRnavigation,
}) {
  const history = useHistory();

  const possibleGrants = recipient.grants.filter(((g) => g.status === 'Active')).map((g) => ({
    value: g.id,
    label: g.numberWithProgramTypes,
  }));

  const goalDefaults = useMemo(() => ({
    name: '',
    endDate: null,
    status: 'Draft',
    grants: possibleGrants.length === 1 ? [possibleGrants[0]] : [],
    objectives: [],
    id,
    onApprovedAR: false,
  }), [possibleGrants, id]);

  const [showForm, setShowForm] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [fetchAttempted, setFetchAttempted] = useState(false);

  // this will store our created goals (vs the goal that's occupying the form at present)
  const [createdGoals, setCreatedGoals] = useState([]);

  // this is for the topic options returned from the API
  const [topicOptions, setTopicOptions] = useState([]);
  // and the same for the roles
  const [roleOptions, setRoleOptions] = useState([]);

  const [goalName, setGoalName] = useState(goalDefaults.name);
  const [endDate, setEndDate] = useState(goalDefaults.endDate);
  const [selectedGrants, setSelectedGrants] = useState(goalDefaults.grants);
  const [goalOnApprovedAR, setGoalOnApprovedReport] = useState(goalDefaults.onApprovedAR);

  // we need to set this key to get the component to re-render (uncontrolled input)
  const [datePickerKey, setDatePickerKey] = useState('DPK-00');

  const [status, setStatus] = useState(goalDefaults.status);
  const [objectives, setObjectives] = useState(goalDefaults.objectives);

  const [alert, setAlert] = useState({ message: '', type: 'success' });
  const [goalNumber, setGoalNumber] = useState('');

  const [errors, setErrors] = useState(FORM_FIELD_DEFAULT_ERRORS);

  const [isLoading, setIsLoading] = useState(false);

  const isOnReport = useMemo(() => objectives.some(
    (objective) => objective.activityReports && objective.activityReports.length > 0,
  ), [objectives]);

  // for fetching goal data from api if it exists
  useEffect(() => {
    async function fetchGoal() {
      setFetchAttempted(true); // as to only fetch once
      try {
        const goal = await goalByIdAndRecipient(id, recipient.id.toString());

        // for these, the API sends us back things in a format we expect
        setGoalName(goal.name);
        setStatus(goal.status);
        setEndDate(goal.endDate ? moment(goal.endDate, 'MM/DD/YYYY').format('YYYY-MM-DD') : '');
        setDatePickerKey(goal.endDate ? `DPK-${goal.endDate}` : '00');
        setGoalNumber(goal.goalNumber);
        setSelectedGrants(formatGrantsFromApi([goal.grant]));
        setGoalOnApprovedReport(goal.onApprovedAR);

        // this is a lot of work to avoid two loops through the goal.objectives
        // but I'm sure you'll agree its totally worth it
        const [
          newObjectives, // return objectives w/ resources and topics formatted as expected
          objectiveErrors, // and we need a matching error for each objective
        ] = goal.objectives.reduce((previous, objective) => {
          const [newObjs, objErrors] = previous;
          let newObjective = objective;

          if (!objective.resources.length) {
            newObjective = {
              ...objective,
              resources: [
                // this is the expected format of a blank resource
                // all objectives start off with one
                {
                  key: uuidv4(),
                  value: '',
                },
              ],
            };
          }

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
        setIsLoading(false);
      }
    }

    if (!fetchAttempted && id !== 'new' && !isLoading) {
      setIsLoading(true);
    }

    // only fetch once, on load, and only if the id isn't 'new'
    if (!fetchAttempted && id !== 'new' && isLoading) {
      fetchGoal();
    }
  }, [errors, fetchAttempted, recipient.id, id, isLoading]);

  // for fetching topic options from API
  useEffect(() => {
    async function fetchTopics() {
      try {
        const topicsFromApi = await getTopics();

        const topicsAsOptions = topicsFromApi.map((topic) => ({
          label: topic.name,
          value: topic.id,
        }));
        setTopicOptions(topicsAsOptions);
      } catch (err) {
        setFetchError('There was an error loading topics');
      }
    }
    fetchTopics();
  }, []);

  // for fetching role options from API
  useEffect(() => {
    async function fetchRoles() {
      try {
        const roles = await getRoles();
        setRoleOptions(roles);
      } catch (err) {
        setFetchError('There was an error loading roles');
      }
    }
    fetchRoles();
  }, []);

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

    if (!goalName) {
      error = <span className="usa-error-message">{message}</span>;
    }

    const newErrors = [...errors];
    newErrors.splice(FORM_FIELD_INDEXES.NAME, 1, error);
    setErrors(newErrors);

    return !error.props.children;
  };

  /**
   *
   * @returns bool
   */
  const validateEndDate = () => {
    let error = <></>;

    if (!endDate || !moment(endDate, 'MM/DD/YYYY').isValid()) {
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
        ];
      }

      if (!objective.topics.length) {
        isValid = false;
        return [
          <></>,
          <span className="usa-error-message">{objectiveTopicsError}</span>,
          <></>,
          <></>,
          <></>,
        ];
      }

      if (!validateListOfResources(objective.resources)) {
        isValid = false;
        return [
          <></>,
          <></>,
          <span className="usa-error-message">{objectiveResourcesError}</span>,
          <></>,
          <></>,
        ];
      }

      if (!objective.status) {
        isValid = false;
        return [
          <></>,
          <></>,
          <></>,
          <span className="usa-error-message">{objectiveStatusError}</span>,
          <></>,
        ];
      }

      return [
        <></>,
        <></>,
        <></>,
        <></>,
        <></>,
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
  );
  const isValidDraft = () => validateGrantNumbers() || validateGoalName() || validateEndDate();

  const updateObjectives = (updatedObjectives) => {
    // when we set a new set of objectives
    // an error object for each objective.
    const newErrors = [...errors];
    const objectiveErrors = updatedObjectives.map(() => OBJECTIVE_DEFAULT_ERRORS);

    newErrors.splice(FORM_FIELD_INDEXES.OBJECTIVES, 1, objectiveErrors);
    setErrors(newErrors);
    setObjectives(updatedObjectives);
  };

  /**
   * button click handlers
   */

  // on form submit
  const onSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // if the goal is a draft, submission should move it to "not started"
      const gs = createdGoals.reduce((acc, goal) => {
        const statusToSave = goal.status && goal.status === 'Draft' ? 'Not Started' : goal.status;
        const newGoals = goal.grants.map((grant) => ({
          grantId: grant.id,
          name: goal.name,
          status: statusToSave,
          endDate: goal.endDate && goal.endDate !== 'Invalid date' ? goal.endDate : null,
          regionId: parseInt(regionId, DECIMAL_BASE),
          recipientId: recipient.id,
          objectives: goal.objectives,
        }));

        return [...acc, ...newGoals];
      }, []);

      const goals = await createOrUpdateGoals(gs);

      // on success, redirect back to RTR Goals & Objectives page
      // once integrated into the AR, this will probably have to be turned into a prop function
      // that gets called on success
      history.push(`/recipient-tta-records/${recipient.id}/region/${parseInt(regionId, DECIMAL_BASE)}/goals-objectives`, {
        ids: goals.map((g) => g.id),
      });
    } catch (err) {
      setAlert({
        message: 'There was an error saving your goal',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onUploadFiles = async (files, objective, setFileUploadErrorMessage, index) => {
    // The first thing we need to know is... does this objective need to be created?
    setIsLoading(true);

    // there is some weirdness where an objective may or may not have the "ids" property
    let objectiveIds = objective.ids ? objective.ids : [];
    if (!objectiveIds.length && objective.id) {
      objectiveIds = [objective.id];
    }

    if (objective.isNew) {
      // if so, we save the objective to the database first
      try {
        // but to do that, we first need to save the goals
        const newGoals = selectedGrants.map((g) => ({
          grantId: g.value,
          name: goalName,
          status,
          endDate: endDate && endDate !== 'Invalid date' ? endDate : null,
          regionId: parseInt(regionId, DECIMAL_BASE),
          recipientId: recipient.id,
          objectives,
        }));

        // so we save them, as before creating one for each grant
        const savedGoals = await createOrUpdateGoals(newGoals);

        // and then we pluck out the objectives from the newly saved goals
        // (there will be only "one")
        objectiveIds = savedGoals.reduce((p, c) => {
          const newObjectives = c.objectives.reduce((prev, o) => {
            if (objective.title === o.title) {
              return [
                ...prev,
                o.id,
                ...o.ids,
              ];
            }

            return prev;
          }, []);

          return Array.from(new Set([...p, ...newObjectives]));
        }, []);
      } catch (err) {
        setFileUploadErrorMessage('File could not be uploaded');
      }
    }

    try {
      // an objective that's been saved should have a set of IDS
      // in the case that it has been rolled up to match a goal for multiple grants
      const data = new FormData();
      data.append('objectiveIds', JSON.stringify(objectiveIds));
      files.forEach((file) => {
        data.append('file', file);
      });

      const response = await uploadObjectivesFile(data);
      setFileUploadErrorMessage(null);

      return {
        ...response,
        objectives,
        setObjectives,
        objectiveIds,
        index,
      };
    } catch (error) {
      setFileUploadErrorMessage('File(s) could not be uploaded');
    } finally {
      setIsLoading(false);
    }

    return null;
  };

  const onSaveDraft = async () => {
    if (!isValidDraft()) {
      return;
    }

    setIsLoading(true);

    try {
      const newGoals = selectedGrants.map((g) => ({
        grantId: g.value,
        name: goalName,
        status,
        endDate: endDate && endDate !== 'Invalid date' ? endDate : null,
        regionId: parseInt(regionId, DECIMAL_BASE),
        recipientId: recipient.id,
        objectives,
      }));
      const goals = [
        ...createdGoals,
        ...newGoals,
      ];
      const updatedGoals = await createOrUpdateGoals(goals);

      const updatedObjectives = updatedGoals && updatedGoals.length > 0
        && updatedGoals[0] && updatedGoals[0].objectives && updatedGoals[0].objectives.length > 0
        ? [...updatedGoals[0].objectives]
        : [];

      updateObjectives(updatedObjectives);

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
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    // clear our form fields
    setGoalName(goalDefaults.name);
    setEndDate(goalDefaults.endDate);
    setStatus(goalDefaults.status);
    setSelectedGrants(goalDefaults.grants);
    setShowForm(false);
    setObjectives([]);
    setDatePickerKey('DPK-00');
  };

  const onSaveAndContinue = async () => {
    if (!isValidNotStarted()) {
      return;
    }

    setIsLoading(true);
    try {
      const newGoals = selectedGrants.map((g) => ({
        grantId: g.value,
        name: goalName,
        status,
        endDate,
        regionId: parseInt(regionId, DECIMAL_BASE),
        recipientId: recipient.id,
        objectives,
      }));

      const goals = [
        ...createdGoals.reduce((acc, goal) => {
          const g = goal.grants.map((grant) => ({
            grantId: grant.id,
            name: goal.name,
            status,
            endDate: goal.endDate && goal.endDate !== 'Invalid date' ? goal.endDate : null,
            regionId: parseInt(regionId, DECIMAL_BASE),
            recipientId: recipient.id,
            objectives: goal.objectives,
          }));
          return [...acc, ...g];
        }, []),
        ...newGoals,
      ];

      const newCreatedGoals = await createOrUpdateGoals(goals);

      setCreatedGoals(newCreatedGoals.map((goal) => ({
        ...goal,
        grants: formatGrantsFromApi(goal.grants),
        objectives: goal.objectives.map((objective) => ({
          ...objective,
        })),
      })));

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
      setIsLoading(false);
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
    setGoalNumber(goal.number);
    setSelectedGrants(goal.grants);

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
    setIsLoading(true);
    try {
      const success = await deleteGoal(g, regionId);

      if (success) {
        const newGoals = createdGoals.filter((goal) => goal.id !== g);
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
      setIsLoading(false);
    }
  };

  return (
    <>
      { showRTRnavigation ? (
        <Link
          className="ttahub-recipient-record--tabs_back-to-search margin-left-2 margin-top-4 margin-bottom-3 display-inline-block"
          to={`/recipient-tta-records/${recipient.id}/region/${regionId}/goals-objectives/`}
        >
          <FontAwesomeIcon className="margin-right-1" color={colors.ttahubMediumBlue} icon={faArrowLeft} />
          <span>Back to Goals & Objectives</span>
        </Link>
      ) : null }
      <h1 className="page-heading margin-top-0 margin-bottom-0 margin-left-2">
        TTA Goals for
        {' '}
        {recipient.name}
        {' '}
        - Region
        {regionId}
      </h1>

      <Container className="margin-y-3 margin-left-2 width-tablet" paddingX={4} paddingY={5}>
        <GoalFormLoadingContext.Provider value={{ isLoading }}>
          { createdGoals.length ? (
            <>
              <ReadOnly
                createdGoals={createdGoals}
                onRemove={onRemove}
                onEdit={onEdit}
                loading={isLoading}
              />
              <div className="margin-bottom-4">
                {!showForm && id === 'new'
                  ? (
                    <PlusButton onClick={() => setShowForm(true)} text="Add another goal" />
                  ) : null }
              </div>
            </>
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
              topicOptions={topicOptions}
              isOnReport={isOnReport}
              isOnApprovedReport={goalOnApprovedAR}
              status={status || 'Needs status'}
              goalNumber={goalNumber}
              onUploadFiles={onUploadFiles}
              roleOptions={roleOptions}
            />
            )}

            { status !== 'Closed' && (
              <div className="margin-top-4">
                { !showForm ? <Button type="submit">Submit goal</Button> : null }
                { showForm ? <Button type="button" onClick={onSaveAndContinue}>Save and continue</Button> : null }
                <Button type="button" outline onClick={onSaveDraft}>Save draft</Button>
                { showForm && !createdGoals.length ? (
                  <Link
                    to={`/recipient-tta-records/${recipient.id}/region/${regionId}/goals-objectives/`}
                    className=" usa-button usa-button--outline"
                  >
                    Cancel
                  </Link>
                ) : null }
                { showForm && createdGoals.length ? (
                  <Button type="button" outline onClick={clearForm} data-testid="create-goal-form-cancel">Cancel</Button>
                ) : null }

                { alert.message ? <Alert role="alert" className="margin-y-2" type={alert.type}>{alert.message}</Alert> : null }
              </div>
            )}
          </form>
        </GoalFormLoadingContext.Provider>
      </Container>
    </>
  );
}

GoalForm.propTypes = {
  id: PropTypes.oneOfType([PropTypes.number.isRequired, PropTypes.string.isRequired]).isRequired,
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
};

GoalForm.defaultProps = {
  showRTRnavigation: false,
};
