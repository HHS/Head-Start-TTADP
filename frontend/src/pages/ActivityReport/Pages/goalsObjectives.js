import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import {
  Fieldset, Label, Textarea,
} from '@trussworks/react-uswds';
import useDeepCompareEffect from 'use-deep-compare-effect';

import GoalPicker from './components/GoalPicker';
import { getGoals } from '../../../fetchers/activityReports';

const GoalsObjectives = ({
  control, grantIds, register, watch, setValue, activityRecipientType,
}) => {
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
  register: PropTypes.func.isRequired,
  setValue: PropTypes.func.isRequired,
  grantIds: PropTypes.arrayOf(PropTypes.number).isRequired,
  watch: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  control: PropTypes.object.isRequired,
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

export default {
  position: 3,
  label: 'Goals and objectives',
  path: 'goals-objectives',
  review: false,
  sections,
  render: (hookForm, additionalData, formData) => {
    const {
      register, watch, control, setValue,
    } = hookForm;
    const recipients = formData.activityRecipients || [];
    const { activityRecipientType } = formData;
    const grantIds = recipients.map((r) => r.activityRecipientId);
    return (
      <GoalsObjectives
        activityRecipientType={activityRecipientType}
        grantIds={grantIds}
        formData={formData}
        setValue={setValue}
        watch={watch}
        register={register}
        control={control}
      />
    );
  },
};
