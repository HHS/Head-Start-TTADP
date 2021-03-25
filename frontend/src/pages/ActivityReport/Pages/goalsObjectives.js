import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Fieldset, Label } from '@trussworks/react-uswds';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import { isUndefined } from 'lodash';
import { Editor } from 'react-draft-wysiwyg';
import { getEditorState } from '../../../utils';

import HtmlReviewItem from './Review/HtmlReviewItem';
import Section from './Review/ReviewSection';
import GoalPicker from './components/GoalPicker';
import { getGoals } from '../../../fetchers/activityReports';
import { validateGoals } from './components/goalValidator';
import RichEditor from '../../../components/RichEditor';

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
          <RichEditor name="context" id="context" />
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
    goals,
  } = watch();

  return (
    <>
      <Section
        hidePrint={isUndefined(context)}
        key="context"
        basePath="goals-objectives"
        anchor="context"
        title="Context"
      >
        <HtmlReviewItem
          label="Context"
          name="context"
        />
      </Section>
      <Section
        hidePrint={isUndefined(goals)}
        key="Goals"
        basePath="goals-objectives"
        anchor="goals-and-objectives"
        title="Goals"
      >
        {goals.map((goal) => {
          const objectives = goal.objectives || [];
          return (
            <div key={goal.id}>
              <div className="grid-row margin-bottom-3 desktop:margin-bottom-0 margin-top-2">
                <span>
                  <span className="text-bold">Goal:</span>
                  {' '}
                  {goal.name}
                </span>
                <div className="padding-left-2 margin-top-2">
                  <>
                    {objectives.map((objective) => (
                      <div key={objective.id} className="desktop:flex-align-end display-flex flex-column flex-justify-center margin-top-1">
                        <div>
                          <span className="text-bold">Objective:</span>
                          {' '}
                          {objective.title}
                        </div>
                        <div>
                          <span className="text-bold">Status:</span>
                          {' '}
                          {objective.status}
                        </div>
                        <div>
                          <span className="text-bold">TTA Provided:</span>
                          {' '}
                          <Editor
                            readOnly
                            toolbarHidden
                            defaultEditorState={getEditorState(objective.ttaProvided)}
                          />
                        </div>
                      </div>
                    ))}
                  </>
                </div>
              </div>
            </div>
          );
        })}
      </Section>
    </>
  );
};

export default {
  position: 3,
  label: 'Goals and objectives',
  path: 'goals-objectives',
  review: false,
  isPageComplete: (formData) => formData.activityRecipientType !== 'grantee' || validateGoals(formData.goals) === true,
  reviewSection: () => <ReviewSection />,
  render: () => (
    <GoalsObjectives />
  ),
};
