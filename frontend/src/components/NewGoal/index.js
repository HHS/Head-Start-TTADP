import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { FormProvider, Controller } from 'react-hook-form';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { GOAL_STATUS } from '@ttahub/common';
import useNewGoalState from '../../hooks/useNewGoalState';
import Container from '../Container';
import GrantSelect from '../GoalForm/GrantSelect';
import FormFieldThatIsSometimesReadOnly from '../GoalForm/FormFieldThatIsSometimesReadOnly';
import GoalFormHeading from '../SharedGoalComponents/GoalFormHeading';
import GoalFormNavigationLink from '../SharedGoalComponents/GoalFormNavigationLink';
import GoalFormTitleGroup from '../SharedGoalComponents/GoalFormTitleGroup';
import GoalNudge from '../GoalForm/GoalNudge';
import GoalFormButton from '../SharedGoalComponents/GoalFormButton';
import GoalFormError from '../SharedGoalComponents/GoalFormError';
import GoalFormAlert from '../SharedGoalComponents/GoalFormAlert';
import ReopenReasonModal from '../ReopenReasonModal';

export default function NewGoal({
  recipient,
  regionId,
}) {
  // this hook will manage the state for the page within itself
  const {
    alert,
    error,
    buttons,
    hookForm,
    submit,
    modalRef,
  } = useNewGoalState(recipient, regionId);

  // we need to memoize this as it is a dependency for the useDeepCompareEffect below
  const possibleGrants = useMemo(() => recipient.grants.filter(((g) => g.status === 'Active')), [recipient.grants]);

  // watch the selected grants
  const { selectedGrants, isGoalNameEditable, goalIds } = hookForm.watch();

  useDeepCompareEffect(() => {
    // if there is only one possible grant, set it as the selected grant
    if (possibleGrants.length === 1) {
      hookForm.setValue('selectedGrants', [possibleGrants[0]]);
    }
  }, [possibleGrants]);

  const onSubmit = async (data) => {
    await submit(data);
  };

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <GoalFormNavigationLink recipient={recipient} regionId={regionId} />
      <GoalFormHeading recipient={recipient} regionId={regionId} />
      <Container className="margin-y-3 margin-left-2 width-tablet" paddingX={4} paddingY={5}>
        <GoalFormTitleGroup />
        <form onSubmit={hookForm.handleSubmit(onSubmit)}>
          <GoalFormError error={error} />
          <Controller
            control={hookForm.control}
            name="selectedGrants"
            render={({ onChange, value, onBlur }) => (
              <FormFieldThatIsSometimesReadOnly
                permissions={[
                // todo: add permission check
                //   userCanEdit,
                  isGoalNameEditable,
                  possibleGrants.length > 1,
                ]}
                label="Recipient grant numbers"
                value={value.map((grant) => grant.numberWithProgramTypes).join(', ')}
              >
                <GrantSelect
                  selectedGrants={value}
                  setSelectedGrants={onChange}
                  possibleGrants={possibleGrants}
                  validateGrantNumbers={onBlur}
                  // todo: add error handling, wrap component in "FormItem"
                  error={<></>}
                  isLoading={false}
                />
              </FormFieldThatIsSometimesReadOnly>
            )}
          />
          <GoalFormAlert alert={alert} />
          <GoalNudge
            recipientId={recipient.id}
            regionId={regionId}
            selectedGrants={selectedGrants}
          />

          {buttons.map((button) => (
            <GoalFormButton
              key={button.id}
              onClick={button.onClick}
              label={button.label}
              variant={button.variant}
              type={button.type}
              to={button.to}
              modalRef={modalRef}
            />
          ))}
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

NewGoal.propTypes = {
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
