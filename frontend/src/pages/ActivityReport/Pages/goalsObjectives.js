import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import {
  Fieldset, Label, Textarea,
} from '@trussworks/react-uswds';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { useFormContext } from 'react-hook-form';
import ReviewPage from './Review/ReviewPage';

import GoalPicker from './components/GoalPicker';
import { getGoals } from '../../../fetchers/activityReports';

const GoalsObjectives = ({
  grantIds, activityRecipientType,
}) => {
  const {
    control,
    register,
    watch,
    setValue,
  } = useFormContext();
  const [availableGoals, updateAvailableGoals] = useState([]);
  const [loading, updateLoading] = useState(true);
  const goals = watch('goals');
  const hasGrants = grantIds.length > 0;

  useDeepCompareEffect(() => {
    const fetch = async () => {
      if (activityRecipientType === 'grantee' && hasGrants) {
        const fetchedGoals = await getGoals(grantIds);
        updateAvailableGoals(fetchedGoals);
      }
      updateLoading(false);
    };
    fetch();
  }, [grantIds]);

  if (loading) {
    return (
      <div>
        loading...
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Goals and objectives</title>
      </Helmet>
      {activityRecipientType === 'grantee' && hasGrants
        && (
        <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Goals and objectives">
          <div id="goals-and-objectives" />
          <GoalPicker
            setValue={setValue}
            control={control}
            availableGoals={availableGoals}
            selectedGoals={goals}
          />
        </Fieldset>
        )}
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Context">
        <Label htmlFor="context">OPTIONAL: Provide background or context for this activity</Label>
        <Textarea id="context" name="context" inputRef={register()} />
      </Fieldset>
    </>
  );
};

GoalsObjectives.propTypes = {
  grantIds: PropTypes.arrayOf(PropTypes.number).isRequired,
  activityRecipientType: PropTypes.string.isRequired,
};

const sections = [
  {
    title: 'Goals and objectives',
    anchor: 'goals-and-objectives',
    items: [
      { label: 'Goals', name: 'goals', path: 'name' },
    ],
  },
  {
    title: 'Context',
    anchor: 'context',
    items: [
      { label: 'Context', name: 'context' },
    ],
  },
];

const ReviewSection = () => (
  <ReviewPage sections={sections} path="goals-objectives" />
);

export default {
  position: 3,
  label: 'Goals and objectives',
  path: 'goals-objectives',
  review: false,
  reviewSection: () => <ReviewSection />,
  render: (additionalData, formData) => {
    const recipients = formData.activityRecipients || [];
    const { activityRecipientType } = formData;
    const grantIds = recipients.map((r) => r.activityRecipientId);
    return (
      <GoalsObjectives
        activityRecipientType={activityRecipientType}
        grantIds={grantIds}
      />
    );
  },
};
