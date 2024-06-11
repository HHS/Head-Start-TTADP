import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useFormContext } from 'react-hook-form';
import { reportIsEditable } from '../../../../utils';
import Section from '../Review/ReviewSection';
import './RecipientReviewSection.scss';
import ReviewItem from '../Review/ReviewItem';

const RecipientReviewSection = () => {
  const { watch } = useFormContext();
  const {
    goalsAndObjectives,
    calculatedStatus,
  } = watch();

  const canEdit = reportIsEditable(calculatedStatus);

  const goals = goalsAndObjectives || [];

  const goalSection = [
    {
      title: 'Goal summary',
      anchor: 'goal-summary',
      items: [
        { label: 'Recipient\'s goal', name: 'name' },
        { label: 'Goal source', name: 'source' },
        {
          label: 'Anticipated close date', name: 'endDate',
        },
      ],
    },
  ];

  const objectiveSections = [
    {
      title: 'Objective summary',
      anchor: 'objectives-summary',
      items: [
        { label: 'TTA objective', name: 'title' },
        {
          label: 'Topics', name: 'topics', path: 'name', sort: true,
        },
        {
          label: 'Resource links', name: 'resources', path: 'value', sort: true,
        },
        {
          label: 'Resource attachments', name: 'files', path: 'url.url', linkNamePath: 'originalFileName', sort: true, isFile: true,
        },
        {
          label: 'TTA provided', name: 'ttaProvided', isRichText: true,
        },
        {
          label: 'Objective status', name: 'status',
        },
      ],
    },
  ];

  const buildGoalReview = (goal) => goalSection[0].items.map((item) => (
    <>
      <ReviewItem
        key={uuidv4()}
        label={item.label}
        path={item.path}
        name={item.name}
        sortValues={item.sort}
        customValue={goal}
      />
    </>
  ));

  const buildObjectiveReview = (objectives, isLastGoal) => {
    const returnObjectives = objectives.map(
      (objective, index) => (
        <Section
          key={uuidv4()}
          basePath="goals-objectives"
          anchor="objectives-summary"
          title="Objective summary"
          canEdit={canEdit}
          isLastSection={isLastGoal && objectives.length - 1 === index}
        >
          {objectiveSections.map((section) => section.items.map((item) => (
            <ReviewItem
              key={uuidv4()}
              label={item.label}
              path={item.path}
              name={item.name}
              sortValues={item.sort}
              customValue={objective}
              linkNamePath={item.linkNamePath}
              isFile={item.isFile}
              isRichText={item.isRichText}
            />
          )))}
        </Section>
      ),
    );
    return returnObjectives;
  };

  return (
    <>
      {
        // Map all goals.
        goals.map((goal, index) => {
          // Build Goal Review Section.
          const goalReview = buildGoalReview(goal);

          // Build Objective Review Section.
          const objectiveReview = buildObjectiveReview(
            goal.objectives,
            goals.length - 1 === index,
          );

          // Return Goal and Objective Review.
          return (
            <Section
              key={uuidv4()}
              basePath="goals-objectives"
              anchor="goal-summary"
              title="Goal summary"
              canEdit={canEdit}
              isLastSection={false}
            >
              <div className="smart-hub-review-section margin-top-2 desktop:margin-top-0 margin-bottom-3">
                {goalReview}
              </div>
              {objectiveReview}
            </Section>
          );
        })
      }
    </>
  );
};

export default RecipientReviewSection;
