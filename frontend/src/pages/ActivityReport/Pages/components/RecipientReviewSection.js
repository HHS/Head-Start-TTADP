import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
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
        { label: 'Goal number', name: 'goalNumber' },
        { label: 'Root cause', name: 'promptsForReview' },
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

  const buildFeiRootCauseReviewSection = (item, goal) => {
    const promptsForReview = goal.promptsForReview || [];
    return (promptsForReview.length > 0 && (
      <div className="grid-row margin-bottom-3 desktop:margin-bottom-0 margin-top-1">
        {promptsForReview.map((v, index) => (
          <>
            <div className="grid-col-12 desktop:grid-col-6 print:grid-col-6  font-sans-2xs desktop:font-sans-sm text-bold desktop:text-normal">
              {item.label}
            </div>
            <div className="grid-col-12 desktop:grid-col-6 print:grid-col-6">
              <div aria-label={`${item.label} ${index + 1}`} key={`${item.label}${v}`} className="desktop:flex-align-end display-flex flex-column flex-justify-center">
                {
          v.responses.length
            ? v.responses.join(', ')
            : (
              <div>
                <FontAwesomeIcon icon={faTriangleExclamation} />
                {' '}
                Missing Information
              </div>
            )
          }
              </div>
              <div>
                <ul>
                  {v.recipients.map((r) => (
                    <li key={uuidv4()}>{r.name}</li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        ))}
      </div>
    )
    );
  };

  const buildGoalReview = (goal) => goalSection[0].items.map((item) => {
    if (item.label === 'Root cause') {
      return buildFeiRootCauseReviewSection(item, goal);
    }

    return (
      <ReviewItem
        key={uuidv4()}
        label={item.label}
        path={item.path}
        name={item.name}
        sortValues={item.sort}
        customValue={goal}
      />
    );
  });

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
