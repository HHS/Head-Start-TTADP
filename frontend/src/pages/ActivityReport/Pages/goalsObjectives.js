import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import {
  Fieldset, Label, Textarea,
} from '@trussworks/react-uswds';

import GoalPicker from './components/GoalPicker';
import { getGoals } from '../../../fetchers/activityReports';

const GoalsObjectives = ({
  control, grantIds, register, watch,
}) => {
  const [availableGoals, updateAvailableGoals] = useState([]);
  const [loading, updateLoading] = useState(true);
  const goals = watch('goals');

  useEffect(() => {
    const fetch = async () => {
      const fetchedGoals = await getGoals(grantIds);
      updateAvailableGoals(fetchedGoals);
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
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Goals and objectives">
        <div id="goals-and-objectives" />
        <GoalPicker control={control} availableGoals={availableGoals} selectedGoals={goals} />
      </Fieldset>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Context">
        <Label htmlFor="context">OPTIONAL: Provide background or context for this activity</Label>
        <Textarea id="context" name="context" inputRef={register()} />
      </Fieldset>
    </>
  );
};

GoalsObjectives.propTypes = {
  register: PropTypes.func.isRequired,
  grantIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  watch: PropTypes.func.isRequired,
  control: PropTypes.func.isRequired,
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
    const { register, watch, control } = hookForm;
    const recipients = formData.activityRecipients;
    const grantIds = recipients.map((r) => r.activityRecipientId);
    return (
      <GoalsObjectives
        grantIds={grantIds}
        formData={formData}
        watch={watch}
        register={register}
        control={control}
      />
    );
  },
};
