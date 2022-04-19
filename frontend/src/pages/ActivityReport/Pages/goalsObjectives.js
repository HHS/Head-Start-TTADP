/* eslint-disable react/jsx-props-no-spreading */
// disabling prop spreading to use the "register" function from react hook form the same
// way they did in thier examples
/* eslint-disable arrow-body-style */
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Fieldset } from '@trussworks/react-uswds';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import GoalPicker, { newGoal } from './components/GoalPicker';
import { getGoals } from '../../../fetchers/activityReports';
import { validateGoals } from './components/goalValidator';
import ObjectivePicker from './components/ObjectivePicker';
import RecipientReviewSection from './components/RecipientReviewSection';
import OtherEntityReviewSection from './components/OtherEntityReviewSection';
import { validateObjectives } from './components/objectiveValidator';
import Req from '../../../components/Req';
import ReadOnly from '../../../components/GoalForm/ReadOnly';
import PlusButton from '../../../components/GoalForm/PlusButton';

const GoalsObjectives = () => {
  const { watch, register, setValue } = useFormContext();
  const recipients = watch('activityRecipients');
  const activityRecipientType = watch('activityRecipientType');
  const isGoalFormClosed = watch('goalFormClosed');
  const selectedGoals = watch('goals');

  const isRecipientReport = activityRecipientType === 'recipient';
  const grantIds = isRecipientReport ? recipients.map((r) => r.activityRecipientId) : [];

  const [availableGoals, updateAvailableGoals] = useState([]);
  const hasGrants = grantIds.length > 0;

  useDeepCompareEffect(() => {
    const fetch = async () => {
      if (isRecipientReport && hasGrants) {
        const fetchedGoals = await getGoals(grantIds);
        updateAvailableGoals(fetchedGoals);
      }
    };
    fetch();
  }, [grantIds]);

  const showGoals = isRecipientReport && hasGrants;

  const addNewGoal = () => {
    setValue('goalFormClosed', false);
    setValue('goalForEditing', newGoal);
  };

  const onDelete = (goalId) => {
    const copyOfSelectedGoals = selectedGoals.map((goal) => ({ ...goal }));
    const index = copyOfSelectedGoals.findIndex((goal) => goal.id === goalId);

    if (index !== -1) {
      copyOfSelectedGoals.splice(index, 1);
    }

    setValue('goals', copyOfSelectedGoals);
  };

  const onEdit = (goal, index) => {
    // remove the goal from the "selected goals"
    const copyOfSelectedGoals = selectedGoals.map((g) => ({ ...g }));

    if (index !== -1) {
      copyOfSelectedGoals.splice(index, 1);
    }

    setValue('goals', copyOfSelectedGoals);

    setValue('goalForEditing', goal);
    setValue('goalFormClosed', false);
  };

  // the read only component expects things a little differently
  const goalsForReview = selectedGoals.map((goal) => {
    return {
      ...goal,
      goalName: goal.name,
      grants: [],
    };
  });

  return (
    <>
      <Helmet>
        <title>Goals and objectives</title>
      </Helmet>
      <p className="usa-prose">
        <Req className="margin-right-1" />
        indicates required field
      </p>
      <input type="hidden" {...register('isGoalFormClosed')} />

      <input
        type="hidden"
        {...register('goals', {
          required: true,
          validate: validateGoals,
        })}
      />

      {!isRecipientReport && (
        <Fieldset className="smart-hub--report-legend" legend="Objectives for other entity TTA">
          <ObjectivePicker />
        </Fieldset>
      )}

      { goalsForReview.length ? (
        <ReadOnly
          onEdit={onEdit}
          onDelete={onDelete}
          createdGoals={goalsForReview}
        />
      ) : null }

      {showGoals && !isGoalFormClosed
        ? (
          <Fieldset className="smart-hub--report-legend" legend="Goal summary">
            <div id="goals-and-objectives" />
            <GoalPicker
              availableGoals={availableGoals}
            />
          </Fieldset>
        ) : (
          <PlusButton onClick={addNewGoal} text="Add new goal" />
        ) }
    </>
  );
};

GoalsObjectives.propTypes = {};

const ReviewSection = () => {
  const { watch } = useFormContext();
  const {
    activityRecipientType,
  } = watch();

  const otherEntity = activityRecipientType === 'other-entity';

  return (
    <>
      {!otherEntity
        && <RecipientReviewSection />}
      {otherEntity
        && <OtherEntityReviewSection />}
    </>
  );
};

export default {
  position: 3,
  label: 'Goals and objectives',
  titleOverride: (formData) => {
    const { activityRecipientType } = formData;
    if (activityRecipientType === 'other-entity') {
      return 'Objectives';
    }
    return 'Goals and objectives';
  },
  path: 'goals-objectives',
  review: false,
  isPageComplete: (formData) => {
    const { activityRecipientType } = formData;

    if (!activityRecipientType) {
      return false;
    }

    if (activityRecipientType === 'other-entity') {
      return validateObjectives(formData.objectivesWithoutGoals) === true;
    }
    return activityRecipientType !== 'recipient' || validateGoals(formData.goals) === true;
  },
  reviewSection: () => <ReviewSection />,
  render: () => (
    <GoalsObjectives />
  ),
};
