import React from 'react';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import { isUndefined } from 'lodash';

import Section from '../Review/ReviewSection';

const GranteeReviewSection = () => {
  const { watch } = useFormContext();
  const {
    goals,
  } = watch();
  return (
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
                        <span className="text-bold">TTA Provided:</span>
                        {' '}
                        {objective.ttaProvided}
                      </div>
                      <div>
                        <span className="text-bold">Status:</span>
                        {' '}
                        {objective.status}
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
  );
};

export default GranteeReviewSection;
