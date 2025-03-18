import React, { useMemo, useContext } from 'react';
import PropTypes from 'prop-types';
import { FormProvider } from 'react-hook-form';
import { Redirect, useHistory } from 'react-router';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { GOAL_STATUS, DECIMAL_BASE } from '@ttahub/common';
import useGoalState from '../../hooks/useGoalState';
import Container from '../Container';
import GoalFormHeading from '../SharedGoalComponents/GoalFormHeading';
import GoalFormNavigationLink from '../SharedGoalComponents/GoalFormNavigationLink';
import GoalFormTitleGroup from '../SharedGoalComponents/GoalFormTitleGroup';
import GoalNudge from '../GoalForm/GoalNudge';
import GoalFormError from '../SharedGoalComponents/GoalFormError';
import GoalFormAlert from '../SharedGoalComponents/GoalFormAlert';
import ReopenReasonModal from '../ReopenReasonModal';
import UserContext from '../../UserContext';
import AppLoadingContext from '../../AppLoadingContext';
import { canEditOrCreateGoals } from '../../permissions';
import { goalsByIdAndRecipient } from '../../fetchers/recipient';
import GoalGrantSingleSelect from '../SharedGoalComponents/GoalGrantSingleSelect';
import GoalFormButtonIterator from '../SharedGoalComponents/GoalFormButtonIterator';
import usePossibleGrants from '../../hooks/usePossibleGrants';

export default function GoalNameForm({
  recipient,
  regionId,
  isExistingGoal,
  ids,
}) {
  // this hook will manage the state for the page within itself
  const {
    alert,
    error,
    buttons,
    hookForm,
    submit,
    modalRef,
  } = useGoalState(recipient, regionId, isExistingGoal);

  const history = useHistory();

  // we need to memoize this as it is a dependency for the useDeepCompareEffect below
  const possibleGrants = usePossibleGrants(recipient);

  // watch the selected grants
  const { selectedGrant, isGoalNameEditable, goalIds } = hookForm.watch();
  const { user } = useContext(UserContext);
  const { setIsAppLoading } = useContext(AppLoadingContext);
  // eslint-disable-next-line max-len
  const userCanEdit = useMemo(() => canEditOrCreateGoals(user, parseInt(regionId, DECIMAL_BASE)), [regionId, user]);

  // for fetching goal data from api if it exists
  useDeepCompareEffect(() => {
    async function fetchGoal() {
      try {
        const [goal] = await goalsByIdAndRecipient(
          ids, recipient.id.toString(),
        );

        // if the goal name is not editable, we redirect to the edit page
        const shouldRedirect = (() => {
          if (goal.onAR) {
            return true;
          }

          if (goal.status === GOAL_STATUS.CLOSED) {
            return true;
          }

          if (goal.isCurated) {
            return true;
          }

          return false;
        })();

        if (shouldRedirect) {
          history.replace(`/recipient-tta-records/${recipient.id}/region/${regionId}/goals/edit?id[]=${goal.goalIds.join('&id[]=')}`);
          return;
        }

        if (goal && goal.name) {
          hookForm.setValue('goalName', goal.name);
          hookForm.setValue('goalStatus', goal.status);
          hookForm.setValue('goalIds', goal.goalIds);
          hookForm.setValue('selectedGrant', goal.grant);
        }
      } catch (err) {
        history.push('/something-went-wrong/500');
      } finally {
        setIsAppLoading(false);
      }
    }

    if (ids && ids.length && isExistingGoal) {
      setIsAppLoading(true);
      fetchGoal();
    }
  }, [history, ids, recipient.id, setIsAppLoading, isExistingGoal]);

  useDeepCompareEffect(() => {
    // if there is only one possible grant, set it as the selected grant
    if (possibleGrants.length === 1) {
      hookForm.setValue('selectedGrant', possibleGrants[0]);
    }
  }, [possibleGrants]);

  const onSubmit = async (data) => {
    setIsAppLoading(true);
    // submit handles errors internally
    await submit(data);
    setIsAppLoading(false);
  };

  if (!userCanEdit) {
    return <Redirect to="/something-went-wrong/401" />;
  }

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <GoalFormNavigationLink recipient={recipient} regionId={regionId} />
      <GoalFormHeading recipient={recipient} regionId={regionId} />
      <Container className="margin-y-3 margin-left-2 width-tablet" paddingX={4} paddingY={5}>
        <GoalFormTitleGroup />
        <form onSubmit={hookForm.handleSubmit(onSubmit)}>
          <GoalFormError error={error} />
          <GoalGrantSingleSelect
            permissions={[
              userCanEdit,
              isGoalNameEditable,
              possibleGrants.length > 1,
              !isExistingGoal,
            ]}
            control={hookForm.control}
            selectedGrant={selectedGrant}
            possibleGrants={possibleGrants}
          />
          <GoalFormAlert alert={alert} />
          <GoalNudge
            recipientId={recipient.id}
            regionId={regionId}
            selectedGrant={selectedGrant}
          />
          <GoalFormButtonIterator buttons={buttons} modalRef={modalRef} />
        </form>
        {/*
          this is not the ideal position for accessibility,
          but since the modal contains a form it shouldn't be
          positioned within the other form
        */}
        <ReopenReasonModal
          modalRef={modalRef}
          onSubmit={async (_ids, reason, context) => {
            await submit({
              reason,
              context,
              modalRef,
              goalIds,
              goalStatus: GOAL_STATUS.CLOSED,
            });
          }}
          goalId={goalIds}
          resetValues={false}
        />
      </Container>
    </FormProvider>
  );
}

GoalNameForm.propTypes = {
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
  isExistingGoal: PropTypes.bool,
  ids: PropTypes.arrayOf(PropTypes.number),
};

GoalNameForm.defaultProps = {
  isExistingGoal: false,
  ids: [],
};
