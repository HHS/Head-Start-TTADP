import React, { useMemo, useContext } from 'react';
import PropTypes from 'prop-types';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import Select from 'react-select';
import { Redirect, useParams } from 'react-router';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { DECIMAL_BASE } from '@ttahub/common';
import Container from '../../components/Container';
import GoalFormHeading from '../../components/SharedGoalComponents/GoalFormHeading';
import GoalFormNavigationLink from '../../components/SharedGoalComponents/GoalFormNavigationLink';
import GoalFormTitleGroup from '../../components/SharedGoalComponents/GoalFormTitleGroup';
// import GoalFormButton from '../../components/SharedGoalComponents/GoalFormButton';
// import GoalFormError from '../../components/SharedGoalComponents/GoalFormError';
import UserContext from '../../UserContext';
import AppLoadingContext from '../../AppLoadingContext';
import { canEditOrCreateGoals } from '../../permissions';
import GoalGrantSingleSelect from '../../components/SharedGoalComponents/GoalGrantSingleSelect';
import useGoalTemplates from '../../hooks/useGoalTemplates';
import FormItem from '../../components/FormItem';
import selectOptionsReset from '../../components/selectOptionsReset';

const GOAL_FORM_FIELDS = {
  SELECTED_GRANT: 'selectedGrant',
  SELECTED_GOAL: 'selectedGoal',
  OBJECTIVES: 'objectives',
  ROOT_CAUSES: 'rootCauses',
};

export default function StandardGoalForm({ recipient }) {
  const { regionId } = useParams();

  const hookForm = useForm({
    defaultValues: {
      [GOAL_FORM_FIELDS.SELECTED_GRANT]: null,
      [GOAL_FORM_FIELDS.SELECTED_GOAL]: null,
      [GOAL_FORM_FIELDS.OBJECTIVES]: [],
      [GOAL_FORM_FIELDS.ROOT_CAUSES]: [],
    },
  });

  // this hook will manage the state for the page within itself
  //   const {
  //     alert,
  //     error,
  //     buttons,
  //     hookForm,
  //     submit,
  //     modalRef,
  //   } = useGoalState(recipient, regionId, isExistingGoal);

  //   const history = useHistory();

  // we need to memoize this as it is a dependency for the useDeepCompareEffect below
  const possibleGrants = useMemo(() => (recipient.grants || []).filter(((g) => g.status === 'Active')), [recipient.grants]);

  // watch the selected grants
  const { selectedGrant } = hookForm.watch();

  const selectedGrants = useMemo(() => [selectedGrant], [selectedGrant]);
  const goalTemplates = useGoalTemplates(selectedGrants, true);

  const { user } = useContext(UserContext);
  const { setIsAppLoading } = useContext(AppLoadingContext);
  // eslint-disable-next-line max-len
  const userCanEdit = useMemo(() => canEditOrCreateGoals(user, parseInt(regionId, DECIMAL_BASE)), [regionId, user]);

  useDeepCompareEffect(() => {
    // if there is only one possible grant, set it as the selected grants
    if (possibleGrants.length === 1) {
      hookForm.setValue('selectedGrant', possibleGrants[0]);
    }
  }, [possibleGrants]);

  const onSubmit = async (data) => {
    // eslint-disable-next-line no-console
    console.log(data);

    setIsAppLoading(true);
    // submit handles errors internally
    // await submit(data);
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
          {/* <GoalFormError error={error} /> */}
          <GoalGrantSingleSelect
            permissions={[
              userCanEdit,
              possibleGrants.length > 1,
            ]}
            control={hookForm.control}
            selectedGrant={selectedGrant}
            possibleGrants={possibleGrants}
          />
          <Controller
            render={({ value, onChange, onBlur }) => (
              <FormItem label="Select recipient's goal" name={GOAL_FORM_FIELDS.SELECTED_GOAL} required>
                <Select
                  aria-label="Select recipient's goal"
                  inputId={GOAL_FORM_FIELDS.SELECTED_GOAL}
                  name={GOAL_FORM_FIELDS.SELECTED_GOAL}
                  className="usa-select"
                  styles={selectOptionsReset}
                  onChange={onChange}
                  options={goalTemplates || []}
                  placeholder="- Select -"
                  value={value}
                  getOptionLabel={(option) => option.name}
                  getOptionValue={(option) => option.id}
                  onBlur={onBlur}
                />
              </FormItem>
            )}
            name={GOAL_FORM_FIELDS.SELECTED_GOAL}
            control={hookForm.control}
            rules={{ required: 'Select a goal' }}
            defaultValue={null}
          />

          {/* {buttons.map((button) => (
            <GoalFormButton
              key={button.id}
              onClick={button.onClick}
              label={button.label}
              variant={button.variant}
              type={button.type}
              to={button.to}
              modalRef={modalRef}
            />
          ))} */}
        </form>
      </Container>
    </FormProvider>
  );
}

StandardGoalForm.propTypes = {
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
};
