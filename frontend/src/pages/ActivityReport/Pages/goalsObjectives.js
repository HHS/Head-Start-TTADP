import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import {
  Fieldset, Label, Textarea,
} from '@trussworks/react-uswds';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { useFormContext } from 'react-hook-form';

import GoalPicker from './components/GoalPicker';
import { getGoals } from '../../../fetchers/activityReports';
import { validateGoals } from './components/goalValidator';

const GoalsObjectives = ({
  grantIds, activityRecipientType,
}) => {
  const {
    register,
  } = useFormContext();
  const [availableGoals, updateAvailableGoals] = useState([]);
  const hasGrants = grantIds.length > 0;

  useDeepCompareEffect(() => {
    const fetch = async () => {
      if (activityRecipientType === 'grantee' && hasGrants) {
        const fetchedGoals = await getGoals(grantIds);
        updateAvailableGoals(fetchedGoals);
      }
    };
    fetch();
  }, [grantIds]);

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
            availableGoals={availableGoals}
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
  grantIds: PropTypes.arrayOf(PropTypes.number),
  activityRecipientType: PropTypes.string,
};

GoalsObjectives.defaultProps = {
  activityRecipientType: '',
  grantIds: [],
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
  isPageComplete: (formData) => validateGoals(formData.goals) === true,
  sections,
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
