/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useEffect, useState, useMemo } from 'react';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Link, useHistory } from 'react-router-dom';
import { Alert, Button } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import Container from '../Container';
import { createOrUpdateGoals, deleteGoal, goalById } from '../../fetchers/goals';
import { getTopics } from '../../fetchers/topics';
import Form from './Form';
import {
  FORM_FIELD_INDEXES,
  FORM_FIELD_DEFAULT_ERRORS,
  validateListOfResources,
  OBJECTIVE_ERROR_MESSAGES,
} from './constants';
import { DECIMAL_BASE, REPORT_STATUSES } from '../../Constants';
import ReadOnly from './ReadOnly';
import PlusButton from './PlusButton';

const [
  objectiveTextError, objectiveTopicsError, objectiveResourcesError, objectiveStatusError,
] = OBJECTIVE_ERROR_MESSAGES;

const formatGrantsFromApi = (grants) => grants.map((grant) => {
  const programTypes = [...new Set(grant.programs.map(({ programType }) => programType))].sort();
  const numberWithProgramTypes = `${grant.number} ${programTypes}`;
  return {
    value: grant.id,
    label: numberWithProgramTypes,
    id: grant.id,
  };
});

export default function CreateGoal({ recipient, regionId, match }) {
  const { params: { goalId: urlId } } = match;

  const history = useHistory();

  const possibleGrants = recipient.grants.map((g) => ({
    value: g.id,
    label: g.numberWithProgramTypes,
  }));

  const goalDefaults = useMemo(() => ({
    goalName: '',
    endDate: null,
    status: 'Draft',
    grants: possibleGrants.length === 1 ? [possibleGrants[0]] : [],
    objectives: [],
    id: urlId,
  }), [possibleGrants, urlId]);

  const [showForm, setShowForm] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // this will store our created goals (vs the goal that's occupying the form at present)
  const [createdGoals, setCreatedGoals] = useState([]);

  // this is for the topic options returned from the API
  const [topicOptions, setTopicOptions] = useState([]);

  const [goalName, setGoalName] = useState(goalDefaults.goalName);
  const [endDate, setEndDate] = useState(goalDefaults.endDate);
  const [selectedGrants, setSelectedGrants] = useState(goalDefaults.grants);

  // we need to set this key to get the component to re-render (uncontrolled input)
  // the idea is that if we need to add another date picker we can just re-render them all at once
  const [datePickerKey, setDatePickerKey] = useState('DPK-00');

  const [status, setStatus] = useState(goalDefaults.status);
  const [objectives, setObjectives] = useState(goalDefaults.objectives);

  // this will hold the topics and resources for objectives retrieved from the API
  // in the case where that data is NOT editable
  const [unchangingApiData, setUnchangingApiData] = useState({});

  const [alert, setAlert] = useState({ message: '', type: 'success' });
  const [goalId, setGoalId] = useState(goalDefaults.id);

  const [errors, setErrors] = useState(FORM_FIELD_DEFAULT_ERRORS);

  const isOnReport = useMemo(() => objectives.some(
    (objective) => objective.activityReports && objective.activityReports.length > 0,
  ), [objectives]);

  const isOnApprovedReport = useMemo(() => objectives.some(
    (objective) => objective.activityReports && objective.activityReports.some((report) => (
      report.status === REPORT_STATUSES.APPROVED
    )),
  ), [objectives]);

  // for fetching goal data from api if it exists
  useEffect(() => {
    async function fetchGoal() {
      try {
        const goal = await goalById(urlId, recipient.id.toString());

        // the API sends us back things in a format we expect
        setGoalName(goal.goalName);
        setStatus(goal.status);
        setEndDate(goal.endDate);
        setDatePickerKey(goal.endDate ? `DPK-${goal.endDate}` : '00');

        const apiData = {};

        // this is a lot of work to avoid two loops through the goal.objectives
        // but I'm sure you'll agree its totally worth it
        const [
          newObjectives, // return objectives w/ resources and topics formatted as expected
          objectiveErrors, // and we need a matching error for each objective
        ] = goal.objectives.reduce((previous, objective) => {
          const [newObjs, objErrors] = previous;
          let newObjective = objective;

          // if the objective is on an AR, then we have to segregate the data
          if (objective.activityReports && objective.activityReports.length) {
            apiData[objective.id] = {};
            apiData[objective.id].topics = objective.topics;
            apiData[objective.id].resources = objective.resources;

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
              topics: [],
            };
            // otherwise, topics are fine, but we still need to checkt to see if there
            // are no resources so we can show the 1 empty box
          } else if (!objective.resources.length) {
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
          objErrors.push([<></>, <></>, <></>]);

          return [newObjs, objErrors];
        }, [[], []]);

        const newErrors = [...errors];
        newErrors.splice(FORM_FIELD_INDEXES.OBJECTIVES, 1, objectiveErrors);
        setErrors(newErrors);

        setObjectives(newObjectives);
        setUnchangingApiData(apiData);
      } catch (err) {
        setFetchError('There was an error loading your goal');
      }
    }

    // wrapped in such a way as to prevent infinite loops
    // if the goal has a name & the id isn't 'new'
    if (!goalName && urlId !== 'new') {
      fetchGoal();
    }
  }, [endDate, errors, goalName, recipient.id, urlId]);

  // for fetching topic options from API
  useEffect(() => {
    async function fetchTopics() {
      const topicsFromApi = await getTopics();

      const topicsAsOptions = topicsFromApi.map((topic) => ({
        label: topic.name,
        value: topic.id,
      }));
      setTopicOptions(topicsAsOptions);
    }

    fetchTopics();
  }, []);

  const setObjectiveError = (objectiveIndex, errorText) => {
    const newErrors = [...errors];
    const objectiveErrors = [...newErrors[FORM_FIELD_INDEXES.OBJECTIVES]];
    objectiveErrors.splice(objectiveIndex, 1, errorText);
    newErrors.splice(FORM_FIELD_INDEXES.OBJECTIVES, 1, objectiveErrors);
    setErrors(newErrors);
  };

  // form field validation functions

  /**
   *
   * @returns bool
   */
  const validateGoalName = () => {
    let error = <></>;

    if (!goalName) {
      error = <span className="usa-error-message">Enter the recipient&apos;s goal</span>;
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

    if (!endDate || !moment(endDate, 'YYYY-MM-DD').isValid()) {
      error = <span className="usa-error-message">Enter a valid date</span>;
    }

    const newErrors = [...errors];
    newErrors.splice(FORM_FIELD_INDEXES.END_DATE, 1, error);
    setErrors(newErrors);
    return !error.props.children;
  };

  const validateGrantNumbers = () => {
    let error = <></>;

    if (!selectedGrants.length) {
      error = <span className="usa-error-message">Select at least one recipient grant number</span>;
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
        ];
      }

      if (!objective.topics.length
        && !unchangingApiData[objective.id]
        && !unchangingApiData[objective.id].topics.length) {
        isValid = false;
        return [
          <></>,
          <span className="usa-error-message">{objectiveTopicsError}</span>,
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
        ];
      }

      if (!objective.status) {
        isValid = false;
        return [
          <></>,
          <></>,
          <></>,
          <span className="usa-error-message">{objectiveStatusError}</span>,
        ];
      }

      return [
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

  // quick shorthands to check to see if our fields are good to save to the different states
  // (different validations for not started and draft)
  const isValidNotStarted = () => (
    validateGrantNumbers() && validateGoalName() && validateEndDate() && validateObjectives()
  );
  const isValidDraft = () => validateEndDate() || validateGrantNumbers() || validateGoalName();

  /**
   * button click handlers
   */

  // on form submit
  const onSubmit = async (e) => {
    e.preventDefault();

    try {
      const goals = await createOrUpdateGoals(createdGoals);

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
    }
  };

  const onSaveDraft = async () => {
    if (!isValidDraft()) {
      return;
    }

    try {
      const goals = [
        ...createdGoals,
        {
          grants: selectedGrants,
          name: goalName,
          status,
          endDate: endDate && endDate !== 'Invalid date' ? endDate : null,
          regionId: parseInt(regionId, DECIMAL_BASE),
          recipientId: recipient.id,
          objectives,
          id: goalId,
        }];

      await createOrUpdateGoals(goals);

      setAlert({
        message: `Your goal was last saved at ${moment().format('MM/DD/YYYY [at] h:mm a')}`,
        type: 'success',
      });
    } catch (error) {
      setAlert({
        message: 'There was an error saving your goal',
        type: 'error',
      });
    }
  };

  const clearForm = () => {
    // clear our form fields
    setGoalName(goalDefaults.goalName);
    setEndDate(goalDefaults.endDate);
    setStatus(goalDefaults.status);
    setSelectedGrants(goalDefaults.grants);
    setGoalId(goalDefaults.id);
    setShowForm(false);
    setObjectives([]);
    setDatePickerKey('DPK-00');
  };

  const onSaveAndContinue = async () => {
    if (!isValidNotStarted()) {
      return;
    }

    try {
      const goals = [
        ...createdGoals,
        {
          grants: selectedGrants,
          name: goalName,
          status,
          endDate,
          regionId: parseInt(regionId, DECIMAL_BASE),
          recipientId: recipient.id,
          objectives: objectives.map((objective) => {
            const apiData = unchangingApiData[objective.id];
            if (apiData) {
              const topicsFromApi = apiData.topics;
              const resourcesFromApi = apiData.resources;
              return {
                ...objective,
                topics: [...objective.topics, ...topicsFromApi],
                resources: [...objective.resources, ...resourcesFromApi],
              };
            }

            return objective;
          }),
          id: goalId,
        }];

      const newCreatedGoals = await createOrUpdateGoals(goals);

      setCreatedGoals(newCreatedGoals.map((goal) => ({
        ...goal,
        grants: formatGrantsFromApi(goal.grants),
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
    }
  };

  const onEdit = (goal, index) => {
    // move from "created goals" to the form

    // first remove from the createdGoals array
    const newCreatedGoals = createdGoals.map((g) => ({ ...g }));
    newCreatedGoals.splice(index, 1);
    setCreatedGoals(newCreatedGoals);

    // then repopulate the form
    setGoalName(goal.goalName);
    setEndDate(goal.endDate);
    setStatus(goal.status);
    setGoalId(goal.id);

    setSelectedGrants(goal.grants);

    // we need to update the date key so it re-renders all the
    // date pickers, as they are uncontrolled inputs
    // PS - endDate can be null
    setDatePickerKey(goal.endDate ? `DPK-${goal.endDate}` : '00');

    // objectives need some special help
    const { objectives: goalObjectives } = goal;

    const newObjectives = [];
    const objectiveApiData = {};

    // we need to break out certain fields that will only allow adding data to them
    // not deleting existing data
    goalObjectives.forEach((objective) => {
      if (objective.activityReports && objective.activityReports.length) {
        newObjectives.push({
          ...objective,
          resources: [],
          topics: [],
        });

        objectiveApiData[objective.id] = {
          resources: objective.resources.map((value) => ({ ...value, isFromApi: true })),
          topics: objective.topics.map((value) => ({ ...value, isFromApi: true })),
        };
      } else {
        newObjectives.push({
          ...objective,
          resources: objective.resources.map((value) => value),
        });
      }
    });

    setUnchangingApiData(objectiveApiData);
    setObjectives(newObjectives);

    setShowForm(true);
  };

  /**
   * takes a goal id and attempts to delete it via
   * HTTP
   * @param {Number} g
   */
  const onDelete = async (g) => {
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
    }
  };

  return (
    <>
      <Link
        className="ttahub-recipient-record--tabs_back-to-search margin-left-2 margin-top-4 margin-bottom-3 display-inline-block"
        to={`/recipient-tta-records/${recipient.id}/region/${regionId}/goals-objectives/`}
      >
        <FontAwesomeIcon className="margin-right-1" color="#0166ab" icon={faArrowLeft} />
        <span>Back to Goals & Objectives</span>
      </Link>
      <h1 className="page-heading margin-top-0 margin-bottom-1 margin-left-2">
        TTA Goals for
        {' '}
        {recipient.name}
        {' '}
        - Region
        {regionId}
      </h1>

      <Container className="margin-y-2 margin-left-2 width-tablet padding-top-1" skipTopPadding>
        { createdGoals.length ? (
          <>
            <ReadOnly
              createdGoals={createdGoals}
              onDelete={onDelete}
              onEdit={onEdit}
            />
            <div className="margin-bottom-4">
              {!showForm && urlId === 'new'
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
            objectives={objectives}
            setObjectives={setObjectives}
            validateObjectives={validateObjectives}
            setObjectiveError={setObjectiveError}
            topicOptions={topicOptions}
            isOnReport={isOnReport}
            isOnApprovedReport={isOnApprovedReport}
            status={status || 'Needs status'}
            unchangingApiData={unchangingApiData}
          />
          )}

          <div className="margin-top-4">
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
            <Button type="button" outline onClick={onSaveDraft}>Save draft</Button>
            { showForm ? <Button type="button" onClick={onSaveAndContinue}>Save and continue</Button> : null }
            { !showForm ? <Button type="submit">Submit goal</Button> : null }
            { alert.message ? <Alert role="alert" className="margin-y-2" type={alert.type}>{alert.message}</Alert> : null }
          </div>
        </form>
      </Container>
    </>
  );
}

CreateGoal.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
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
