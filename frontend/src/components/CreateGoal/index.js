/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Link, useHistory } from 'react-router-dom';
import { Button } from '@trussworks/react-uswds';
import ReactRouterPropTypes from 'react-router-prop-types';
import PropTypes from 'prop-types';
import Container from '../Container';
import { createOrUpdateGoals } from '../../fetchers/goals';
import Form from './Form';
import { DECIMAL_BASE } from '../../Constants';
import ReadOnly from './ReadOnly';

export default function CreateGoal({ recipient, regionId, match }) {
  const { goalId } = match.params;
  const history = useHistory();

  const possibleGrants = recipient.grants.map((g) => ({
    value: g.id,
    label: g.numberWithProgramTypes,
  }));

  const goalDefaults = useMemo(() => ({
    goalName: '',
    endDate: '',
    status: 'Draft',
    grants: possibleGrants.length === 1 ? [possibleGrants[0]] : [],
    id: goalId,
  }), [goalId, possibleGrants]);

  const [selectedGrants, setSelectedGrants] = useState(goalDefaults.grants);

  const [showForm] = useState(true);

  // this will store our created goals
  const [createdGoals, setCreatedGoals] = useState([]);

  const [goalName, setGoalName] = useState(goalDefaults.goalName);
  const [endDate, setEndDate] = useState(goalDefaults.endDate);
  const [status, setStatus] = useState(goalDefaults.status);

  // save goal to backend
  const saveGoals = async () => createOrUpdateGoals({
    goals: [{
      grants: selectedGrants.map((g) => g.value),
      name: goalName,
      status,
      endDate,
      regionId: parseInt(regionId, DECIMAL_BASE),
      recipientId: recipient.id,
    }, ...createdGoals],
  });

  /**
   * button click handlers
   */

  // on form submit
  const onSubmit = async (e) => {
    e.preventDefault();

    try {
      const newCreatedGoals = createdGoals.map((g) => ({
        ...g,
        status: 'Not started',
      }));

      setCreatedGoals(newCreatedGoals);

      const goals = await saveGoals();
      history.push(`/recipient-tta-records/${recipient.id}/region/${parseInt(regionId, DECIMAL_BASE)}/goals-objectives`, {
        ids: goals.map((g) => g.id),
      });
    } catch (err) {
    //
      console.log(err);
    }
  };

  const onSaveDraft = async () => {
    try {
      await saveGoals();
    } catch (error) {
      //
      console.log(error);
    }
  };

  const onSaveAndContinue = async () => {
    try {
      const goals = await saveGoals();
      setCreatedGoals(goals);

      // clear our form fields
      setGoalName(goalDefaults.goalName);
      setEndDate(goalDefaults.endDate);
      setStatus(goalDefaults.status);
      setSelectedGrants(goalDefaults.grants);
    } catch (error) {
      //
      console.log(error);
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
      <h1 className="landing margin-top-0 margin-bottom-1 margin-left-2">
        TTA Goals for
        {' '}
        {recipient.name}
        {' '}
        - Region
        {regionId}
      </h1>
      <Container className="margin-y-2 margin-left-2 width-tablet padding-top-1" skipTopPadding>
        { createdGoals.length ? (
          <ReadOnly
            createdGoals={createdGoals}
          />
        ) : null }

        <form onSubmit={onSubmit}>
          <Form
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
          />

          <div className="margin-top-4">
            { showForm ? (
              <Link
                to={`/recipient-tta-records/${recipient.id}/region/${regionId}/goals-objectives/`}
                className=" usa-button usa-button--outline"
              >
                Cancel
              </Link>
            ) : null }
            <Button type="button" outline onClick={onSaveDraft}>Save draft</Button>
            { showForm ? <Button type="button" onClick={onSaveAndContinue}>Save and continue</Button> : null }
            { !showForm ? <Button type="submit">Submit goal</Button> : null }
          </div>
        </form>
      </Container>
    </>
  );
}

CreateGoal.propTypes = {
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
  match: ReactRouterPropTypes.match.isRequired,
};
