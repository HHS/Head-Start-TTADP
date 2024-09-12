import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';
import './GoalCard.scss';

function GoalCard({
  goal,
  expanded,
}) {
  return (
    <>
      {expanded && (
      <Grid className="bg-base-lightest margin-top-2 padding-2 usa-prose radius-lg">
        <Grid row>
          <Grid col={1}>Goal number</Grid>
          <Grid col={2}>
            <Link to="recipient-tta-records/376/region/1/goals?id[]=83697">
              {goal.goalNumber}
            </Link>
          </Grid>
        </Grid>
        <Grid row>
          <Grid col={1}>Goal status</Grid>
          <Grid col={2}>
            {goal.status}
          </Grid>
        </Grid>
        <Grid row>
          <Grid col={1}>Creator</Grid>
          <Grid col={2}>{goal.creator}</Grid>
        </Grid>
        <Grid row>
          <Grid col={1}>Collaborator</Grid>
          <Grid col={2}>{goal.collaborator}</Grid>
        </Grid>
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
