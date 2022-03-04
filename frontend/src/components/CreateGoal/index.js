/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Link, useHistory } from 'react-router-dom';
import ReactRouterPropTypes from 'react-router-prop-types';
import PropTypes from 'prop-types';
import Container from '../Container';
import { createOrUpdateGoal } from '../../fetchers/goals';
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

  const [selectedGrants, setSelectedGrants] = useState(
    possibleGrants.length === 1 ? [possibleGrants[0]] : [],
  );

  const [goalName, setGoalName] = useState('');
  const [endDate, setEndDate] = useState();
  const [status] = useState('Draft');
  const [id, setId] = useState(goalId);

  const [readOnly, setReadOnly] = useState(false);

  // save goal to backend
  const saveGoal = async () => createOrUpdateGoal({
    id,
    grants: selectedGrants.map((g) => g.value),
    name: goalName,
    status,
    endDate,
    regionId: parseInt(regionId, DECIMAL_BASE),
    recipientId: recipient.id,
  });

  // on form submit
  const onSubmit = (e) => e.preventDefault();

  const onSaveDraft = async () => {
    try {
      const goal = await saveGoal();
      setId(goal.id);
      history.push(`/recipient-tta-records/${recipient.id}/region/${regionId}/goal/${goal.id}`);
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
        <form onSubmit={onSubmit}>
          { readOnly
            ? (
              <ReadOnly
                goalName={goalName}
                grants={selectedGrants}
                endDate={endDate}
              />
            )
            : (
              <Form
                saveGoal={saveGoal}
                onSaveDraft={onSaveDraft}
                setId={setId}
                setReadOnly={setReadOnly}
                possibleGrants={possibleGrants}
                selectedGrants={selectedGrants}
                setSelectedGrants={setSelectedGrants}
                goalName={goalName}
                setGoalName={setGoalName}
                recipient={recipient}
                regionId={regionId}
                endDate={endDate}
                setEndDate={setEndDate}
                history={history}
              />
            ) }
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
