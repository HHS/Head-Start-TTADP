import React from 'react';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import { isUndefined } from 'lodash';
import { Editor } from 'react-draft-wysiwyg';
import { getEditorState, reportIsEditable } from '../../../../utils';

import Section from '../Review/ReviewSection';

const NonGranteeReviewSection = () => {
  const { watch } = useFormContext();
  const {
    objectivesWithoutGoals,
    calculatedStatus,
  } = watch();

  const canEdit = reportIsEditable(calculatedStatus);

  return (
    <Section
      hidePrint={isUndefined(objectivesWithoutGoals)}
      key="Objectives"
      basePath="goals-objectives"
      anchor="goals-and-objectives"
      title="Objectives"
      canEdit={canEdit}
    >
      <>
        {objectivesWithoutGoals.map((objective) => (
          <div key={objective.id} className="desktop:flex-align-end display-flex flex-column flex-justify-center margin-top-1">
            <div>
              <span className="text-bold">Objective:</span>
              {' '}
              {objective.title}
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
            <div>
              <span className="text-bold">Status:</span>
              {' '}
              {objective.status}
            </div>
          </div>
        ))}
      </>
    </Section>
  );
};

export default NonGranteeReviewSection;
