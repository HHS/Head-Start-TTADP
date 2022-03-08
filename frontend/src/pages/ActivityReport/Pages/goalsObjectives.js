import React, { useContext, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Fieldset, Label, Alert } from '@trussworks/react-uswds';
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
import RecipientReviewSection from './components/RecipientReviewSection';
import OtherEntityReviewSection from './components/OtherEntityReviewSection';
import { validateObjectives } from './components/objectiveValidator';
import NetworkContext from '../../../NetworkContext';

const GoalsObjectives = () => {
  const { watch } = useFormContext();
  const { connectionActive } = useContext(NetworkContext);
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
      <Fieldset className="smart-hub--report-legend margin-top-4" legend="Context">
        <Label htmlFor="context">Provide background or context for this activity</Label>
        <div className="smart-hub--text-area__resize-vertical margin-top-1">
          <HookFormRichEditor ariaLabel="Context" name="context" id="context" />
        </div>
      </Fieldset>
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
            { !connectionActive && (
            <Alert>
              An issue with your network connection has prevented us from retrieving goals for you.
            </Alert>
            )}
          </Fieldset>
        )}
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
  const otherEntity = activityRecipientType === 'other-entity';

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
