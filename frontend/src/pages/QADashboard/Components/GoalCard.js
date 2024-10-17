import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';
import DataRow from '../../../components/DataRow';

function GoalCard({
  goal,
  recipientId,
  regionId,
  expanded,
}) {
  return (
    <>
      {expanded && (
      <Grid className="bg-base-lightest margin-top-2 padding-2 usa-prose radius-lg">
        <DataRow
          label="Goal number"
          value={(
            <Link to={`/recipient-tta-records/${recipientId}/region/${regionId}/goals?id[]=${goal.id}`}>
              {goal.goalNumber}
            </Link>
          )}
        />
        <DataRow
          label="Goal status"
          value={goal.status}
        />
        <DataRow
          label="Creator"
          value={goal.creator}
        />
        <DataRow
          label="Collaborator"
          value={goal.collaborator}
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
  recipientId: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
};
export default GoalCard;
