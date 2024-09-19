import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';

function GoalCard({
  goal,
  expanded,
}) {
  return (
    <>
      {expanded && (
      <Grid className="bg-base-lightest margin-top-2 padding-2 usa-prose radius-lg">
        <Grid row className="margin-bottom-1">
          <Grid
            col={1}
            desktop={{ col: true }}
            tablet={{ col: true }}
            mobileLg={{ col: true }}
          >
            Goal number
          </Grid>
          <Grid
            className="margin-left-2"
            col={2}
            desktop={{ col: 10 }}
            tablet={{ col: 8 }}
            mobileLg={{ col: true }}
          >
            <Link to="recipient-tta-records/376/region/1/goals?id[]=83697">
              {goal.goalNumber}
            </Link>
          </Grid>
        </Grid>
        <Grid row className="margin-bottom-1">
          <Grid
            col={1}
            desktop={{ col: true }}
            tablet={{ col: true }}
            mobileLg={{ col: true }}
          >
            Goal status
          </Grid>
          <Grid
            className="margin-left-2"
            col={2}
            desktop={{ col: 10 }}
            tablet={{ col: 8 }}
            mobileLg={{ col: true }}
          >
            {goal.status}
          </Grid>
        </Grid>
        <Grid row className="margin-bottom-1">
          <Grid
            col={1}
            desktop={{ col: true }}
            tablet={{ col: true }}
            mobileLg={{ col: true }}
          >
            Creator
          </Grid>
          <Grid
            col={2}
            desktop={{ col: 10 }}
            tablet={{ col: 8 }}
            mobileLg={{ col: true }}
            className="margin-left-2"
          >
            {goal.creator}
          </Grid>
        </Grid>
        <Grid row className="margin-bottom-1">
          <Grid
            col={1}
            desktop={{ col: true }}
            tablet={{ col: true }}
            mobileLg={{ col: true }}
          >
            Collaborator
          </Grid>
          <Grid
            col={2}
            desktop={{ col: 10 }}
            tablet={{ col: 8 }}
            mobileLg={{ col: true }}
            className="margin-left-2"
          >
            {goal.collaborator}
          </Grid>
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
