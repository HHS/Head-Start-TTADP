import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';
import DataRow from '../../../components/DataRow';

function GoalCard({
  goal,
  expanded,
}) {
  return (
    <>
      {expanded && (
      <Grid className="bg-base-lightest margin-top-2 padding-2 usa-prose radius-lg">
        <DataRow
          label="Goal number"
          value={(
            <Link to="recipient-tta-records/376/region/1/goals?id[]=83697">
              {goal.goalNumber}
            </Link>
          )}
        />
        <DataRow
          label="Goal status"
          value={(
            <Link to="recipient-tta-records/376/region/1/goals?id[]=83697">
              {goal.status}
            </Link>
          )}
        />
        <DataRow
          label="Creator"
          value={(
            <Link to="recipient-tta-records/376/region/1/goals?id[]=83697">
              {goal.creator}
            </Link>
          )}
        />
        <DataRow
          label="Collaborator"
          value={(
            <Link to="recipient-tta-records/376/region/1/goals?id[]=83697">
              {goal.collaborator}
            </Link>
          )}
        />
      </Grid>
      )}
    </>
  );
}

export const goalPropTypes = PropTypes.shape({
  goalNumber: PropTypes.string.isRequired,
  goalStatus: PropTypes.string.isRequired,
  creator: PropTypes.string.isRequired,
  collaborator: PropTypes.string.isRequired,
}).isRequired;

GoalCard.propTypes = {
  goal: goalPropTypes.isRequired,
  expanded: PropTypes.bool.isRequired,
};
export default GoalCard;
