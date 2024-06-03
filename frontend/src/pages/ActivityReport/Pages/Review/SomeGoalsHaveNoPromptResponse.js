import React, { useState } from 'react';
import PropTypes from 'prop-types';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { Alert, Button } from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';
import { missingDataForActivityReport } from '../../../../fetchers/goals';

const SomeGoalsHaveNoPromptResponse = ({
  promptsMissingResponses,
  goalsMissingResponses,
  regionId,
}) => {
  const [missingGoalData, setMissingGoalData] = useState();

  async function fetchMissingData(goalIds) {
    try {
      const data = await missingDataForActivityReport(regionId, goalIds);
      setMissingGoalData(data);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching missing data', error);
    }
  }

  useDeepCompareEffect(() => {
    const ids = goalsMissingResponses.map((goal) => goal.goalIds).flat();
    if (!ids.length) return;
    if (!regionId) return;

    fetchMissingData(ids);
  }, [goalsMissingResponses, regionId]);

  if (!missingGoalData || !missingGoalData.length) {
    return null;
  }

  return (
    <Alert validation noIcon slim type="error">
      <strong>Some goals are incomplete</strong>
      <br />
      Please check the Recipient TTA Record and complete the missing fields.
      <ul>
        {promptsMissingResponses.map((prompt) => (
          <li key={prompt}>
            {prompt}
          </li>
        ))}
      </ul>

      { (missingGoalData.length > 0) && (
        <details>
          <summary>Complete your goals</summary>
          <ul className="usa-list">
            {missingGoalData.map((goal) => (
              <li key={goal.id}>
                <Link
                  aria-label={`Edit goal ${goal.id} in a new tab`}
                  to={`/recipient-tta-records/${goal.recipientId}/region/${goal.regionId}/goals?id[]=${goal.id}`}
                  target="_blank"
                >
                  {goal.recipientName}
                  {' '}
                  {goal.grantNumber}
                  {' '}
                  {goal.id}
                </Link>
              </li>
            ))}
          </ul>
          <Button
            unstyled
            onClick={() => {
              fetchMissingData(goalsMissingResponses.map((goal) => goal.goalIds).flat());
            }}
          >
            Refresh list of goals
          </Button>
        </details>
      )}

    </Alert>
  );
};

SomeGoalsHaveNoPromptResponse.propTypes = {
  promptsMissingResponses: PropTypes.arrayOf(PropTypes.string).isRequired,
  goalsMissingResponses: PropTypes.arrayOf(PropTypes.shape({
    goalIds: PropTypes.arrayOf(PropTypes.number),
  })).isRequired,
  regionId: PropTypes.number.isRequired,
};

export default SomeGoalsHaveNoPromptResponse;
