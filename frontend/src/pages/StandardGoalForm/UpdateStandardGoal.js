import PropTypes from 'prop-types';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router';
import AppLoadingContext from '../../AppLoadingContext';
import { ROUTES } from '../../Constants';
import { HTTPError } from '../../fetchers';
import { getStandardGoal } from '../../fetchers/standardGoals';
import useGoalTemplatePrompts from '../../hooks/useGoalTemplatePrompts';
import UpdateStandardGoalForm from './UpdateStandardGoalForm';

export default function UpdateStandardGoal({ recipient }) {
  const { goalTemplateId, regionId, grantId } = useParams();
  const history = useHistory();
  const location = useLocation();
  const defaultBackLinkTo = `/recipient-tta-records/${recipient.id}/region/${regionId}/rttapa`;
  const backLinkTo = location.state?.backLinkTo || defaultBackLinkTo;

  const { setIsAppLoading } = useContext(AppLoadingContext);

  const [goal, setGoal] = useState(null);
  const fetchAttempted = useRef(false);

  const [goalTemplatePrompts] = useGoalTemplatePrompts(goalTemplateId);

  useEffect(() => {
    const fetchStandardGoal = async () => {
      try {
        setIsAppLoading(true);

        const g = await getStandardGoal(goalTemplateId, grantId);

        if (!g) {
          throw new HTTPError('Goal not found', 404);
        }

        setGoal(g);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        history.push(`${ROUTES.SOMETHING_WENT_WRONG}/${err.status}`);
      } finally {
        setIsAppLoading(false);
      }
    };

    if (goal) {
      return;
    }

    if (goalTemplateId && grantId && goalTemplatePrompts) {
      if (fetchAttempted.current) {
        return;
      }

      fetchAttempted.current = true;
      fetchStandardGoal();
    }
  }, [goal, goalTemplateId, goalTemplatePrompts, grantId, history, setIsAppLoading]);

  if (!goal) {
    return null;
  }

  return (
    <UpdateStandardGoalForm
      goal={goal}
      goalTemplatePrompts={goalTemplatePrompts}
      recipient={recipient}
      regionId={regionId}
      goalTemplateId={goalTemplateId}
      grantId={grantId}
      backLinkTo={backLinkTo}
    />
  );
}

UpdateStandardGoal.propTypes = {
  recipient: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    grants: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        numberWithProgramTypes: PropTypes.string,
      })
    ),
  }).isRequired,
};
