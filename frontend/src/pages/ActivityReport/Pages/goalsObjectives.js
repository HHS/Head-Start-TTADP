import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Fieldset, Label } from '@trussworks/react-uswds';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import { isUndefined } from 'lodash';

import HtmlReviewItem from './Review/HtmlReviewItem';
import Section from './Review/ReviewSection';
import GoalPicker from './components/GoalPicker';
import { getGoals } from '../../../fetchers/activityReports';
import { validateGoals } from './components/goalValidator';
import { reportIsEditable } from '../../../utils';
import HookFormRichEditor from '../../../components/HookFormRichEditor';
import ObjectivePicker from './components/ObjectivePicker';
import GranteeReviewSection from './components/GranteeReviewSection';
import NonGranteeReviewSection from './components/NonGranteeReviewSection';
import { validateObjectives } from './components/objectiveValidator';

const GoalsObjectives = () => {
  const { watch } = useFormContext();
  const recipients = watch('activityRecipients');
  const activityRecipientType = watch('activityRecipientType');
  const recipientGrantee = activityRecipientType === 'grantee';
  const grantIds = recipientGrantee ? recipients.map((r) => r.activityRecipientId) : [];

  const [availableGoals, updateAvailableGoals] = useState([]);
  const hasGrants = grantIds.length > 0;

  useDeepCompareEffect(() => {
    const fetch = async () => {
      if (recipientGrantee && hasGrants) {
        const fetchedGoals = await getGoals(grantIds);
        updateAvailableGoals(fetchedGoals);
      }
    };
    fetch();
  }, [grantIds]);

  const showGoals = recipientGrantee && hasGrants;

  return (
    <>
      <Helmet>
        <title>Goals and objectives</title>
      </Helmet>
      {!recipientGrantee && (
        <Fieldset className="smart-hub--report-legend margin-top-4" legend="Objectives for non-grantee TTA">
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
      <Fieldset className="smart-hub--report-legend margin-top-4" legend="Context">
        <Label htmlFor="context">OPTIONAL: Provide background or context for this activity</Label>
        <div className="margin-top-1">
          <HookFormRichEditor ariaLabel="Context" name="context" id="context" />
        </div>
      </Fieldset>
    </>
  );
};

GoalsObjectives.propTypes = {};

const ReviewSection = () => {
  const { watch } = useFormContext();
  const {
    context,
    calculatedStatus,
    activityRecipientType,
  } = watch();

  const canEdit = reportIsEditable(calculatedStatus);
  const nonGrantee = activityRecipientType === 'non-grantee';

  return (
    <>
      <Section
        hidePrint={isUndefined(context)}
        key="context"
        basePath="goals-objectives"
        anchor="context"
        title="Context"
        canEdit={canEdit}
      >
        <HtmlReviewItem
          label="Context"
          name="context"
        />
      </Section>
      {!nonGrantee
        && <GranteeReviewSection />}
      {nonGrantee
        && <NonGranteeReviewSection />}
    </>
  );
};

export default {
  position: 3,
  label: 'Goals and objectives',
  titleOverride: (formData) => {
    const { activityRecipientType } = formData;
    if (activityRecipientType === 'non-grantee') {
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

    if (activityRecipientType === 'non-grantee') {
      return validateObjectives(formData.objectivesWithoutGoals) === true;
    }
    return activityRecipientType !== 'grantee' || validateGoals(formData.goals) === true;
  },
  reviewSection: () => <ReviewSection />,
  render: () => (
    <GoalsObjectives />
  ),
};
