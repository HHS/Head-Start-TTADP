import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Fieldset } from '@trussworks/react-uswds';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import GoalPicker from './components/GoalPicker';
import { getGoals } from '../../../fetchers/activityReports';
import { validateGoals } from './components/goalValidator';
import ObjectivePicker from './components/ObjectivePicker';
import RecipientReviewSection from './components/RecipientReviewSection';
import OtherEntityReviewSection from './components/OtherEntityReviewSection';
import { validateObjectives } from './components/objectiveValidator';

const GoalsObjectives = () => {
  const { watch } = useFormContext();
  const recipients = watch('activityRecipients');
  const activityRecipientType = watch('activityRecipientType');
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

  return (
    <>
      <Helmet>
        <title>Goals and objectives</title>
      </Helmet>
      {!isRecipientReport && (
        <Fieldset className="smart-hub--report-legend margin-top-4" legend="Objectives for other entity TTA">
          <ObjectivePicker />
        </Fieldset>
      )}
      {showGoals
        && (
        <Fieldset className="smart-hub--report-legend margin-top-4" legend="Goals and objectives">
          <div id="goals-and-objectives" />
          <GoalPicker
            availableGoals={availableGoals}
          />
        </Fieldset>
        )}
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
  position: 2,
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
