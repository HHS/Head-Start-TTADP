import React, { useMemo, useContext } from 'react';
import { GOAL_STATUS, DECIMAL_BASE } from '@ttahub/common';
import PropTypes from 'prop-types';
import {
  Controller,
  FormProvider,
  useForm,
} from 'react-hook-form';
import Select from 'react-select';
import { Redirect, useParams, useHistory } from 'react-router';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { uniqueId } from 'lodash';
import UserContext from '../../UserContext';
import AppLoadingContext from '../../AppLoadingContext';
import { canEditOrCreateGoals } from '../../permissions';
import useGoalTemplates from '../../hooks/useGoalTemplates';
import useGoalTemplatePrompts from '../../hooks/useGoalTemplatePrompts';
import FormItem from '../../components/FormItem';
import selectOptionsReset from '../../components/selectOptionsReset';
import { GOAL_FORM_BUTTON_LABELS, GOAL_FORM_BUTTON_TYPES, GOAL_FORM_BUTTON_VARIANTS } from '../../components/SharedGoalComponents/constants';
import GoalFormHeading from '../../components/SharedGoalComponents/GoalFormHeading';
import GoalGrantSingleSelect from '../../components/SharedGoalComponents/GoalGrantSingleSelect';
import GoalFormNavigationLink from '../../components/SharedGoalComponents/GoalFormNavigationLink';
import GoalFormTitleGroup from '../../components/SharedGoalComponents/GoalFormTitleGroup';
import GoalFormButtonIterator from '../../components/SharedGoalComponents/GoalFormButtonIterator';
import ObjectivesSection from '../../components/SharedGoalComponents/ObjectivesSection';
import GoalFormContainer from '../../components/SharedGoalComponents/GoalFormContainer';
import { addStandardGoal } from '../../fetchers/standardGoals';
import { GOAL_FORM_FIELDS, mapObjectivesAndRootCauses } from './constants';
import GoalFormTemplatePrompts from '../../components/SharedGoalComponents/GoalFormTemplatePrompts';
import { ROUTES } from '../../Constants';
import usePossibleGrants from '../../hooks/usePossibleGrants';

const missingStandardGoalToolTip = 'Goals listed haven’t been used by the recipient. To reopen a goal, go to the Recipient TTA Record RTTAPA tab.';

export default function StandardGoalForm({ recipient }) {
  const { regionId } = useParams();

  const history = useHistory();

  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues: {
      [GOAL_FORM_FIELDS.SELECTED_GRANT]: null,
      [GOAL_FORM_FIELDS.SELECTED_GOAL]: null,
      [GOAL_FORM_FIELDS.ROOT_CAUSES]: [],
    },
  });

  const standardGoalFormButtons = useMemo(() => [
    {
      id: uniqueId('goal-form-button-'),
      type: GOAL_FORM_BUTTON_TYPES.SUBMIT,
      variant: GOAL_FORM_BUTTON_VARIANTS.PRIMARY,
      label: GOAL_FORM_BUTTON_LABELS.ADD_GOAL,
    },
    {
      id: uniqueId('goal-form-button-'),
      type: GOAL_FORM_BUTTON_TYPES.LINK,
      variant: GOAL_FORM_BUTTON_VARIANTS.OUTLINE,
      label: GOAL_FORM_BUTTON_LABELS.CANCEL,
      to: `/recipient-tta-records/${recipient.id}/region/${regionId}/rttapa/`,
    },
  ], [recipient.id, regionId]);

  // we need to memoize this as it is a dependency for the useDeepCompareEffect below
  const possibleGrants = usePossibleGrants(recipient);

  // watch the selected grants
  const { selectedGrant, selectedGoal } = hookForm.watch();

  const selectedGrants = useMemo(() => [selectedGrant], [selectedGrant]);
  const goalTemplates = useGoalTemplates(selectedGrants, true, true);

  const { user } = useContext(UserContext);
  const { setIsAppLoading } = useContext(AppLoadingContext);
  // eslint-disable-next-line max-len
  const userCanEdit = useMemo(() => canEditOrCreateGoals(user, parseInt(regionId, DECIMAL_BASE)), [regionId, user]);

  const [goalTemplatePrompts] = useGoalTemplatePrompts(
    selectedGoal ? selectedGoal.id : null,
  );
  useDeepCompareEffect(() => {
    // if there is only one possible grant, set it as the selected grants
    if (possibleGrants.length === 1) {
      hookForm.setValue('selectedGrant', possibleGrants[0]);
    }
  }, [possibleGrants]);

  const onSubmit = async (data) => {
    try {
      setIsAppLoading(true);

      // submit to backend
      await addStandardGoal({
        goalTemplateId: selectedGoal.id,
        grantId: selectedGrant.id,
        ...mapObjectivesAndRootCauses(data),
      });

      history.push(`/recipient-tta-records/${recipient.id}/region/${regionId}/rttapa`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      history.push(`${ROUTES.SOMETHING_WENT_WRONG}/${err.status}`);
    } finally {
      setIsAppLoading(false);
    }
  };

  if (!userCanEdit) {
    return <Redirect to="/something-went-wrong/401" />;
  }

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <GoalFormNavigationLink recipient={recipient} regionId={regionId} />
      <GoalFormHeading recipient={recipient} regionId={regionId} />
      <GoalFormContainer>
        <GoalFormTitleGroup status={GOAL_STATUS.NOT_STARTED} />
        <form onSubmit={hookForm.handleSubmit(onSubmit)}>
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
              <FormItem
                label="Recipient's goal"
                name={GOAL_FORM_FIELDS.SELECTED_GOAL}
                toolTipText={missingStandardGoalToolTip}
                htmlFor={GOAL_FORM_FIELDS.SELECTED_GOAL}
                required
              >

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
          <GoalFormTemplatePrompts goalTemplatePrompts={goalTemplatePrompts} />
          {selectedGoal ? <ObjectivesSection /> : <div className="margin-top-4" />}
          <GoalFormButtonIterator buttons={standardGoalFormButtons} />
        </form>
      </GoalFormContainer>
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
