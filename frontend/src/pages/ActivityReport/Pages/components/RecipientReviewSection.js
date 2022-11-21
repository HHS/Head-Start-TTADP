import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import { isUndefined } from 'lodash';
import { Editor } from 'react-draft-wysiwyg';
import { getEditorState, reportIsEditable } from '../../../../utils';

import Section from '../Review/ReviewSection';

const RecipientReviewSection = () => {
  const { watch } = useFormContext();
  const {
    goals,
    calculatedStatus,
  } = watch();

  const canEdit = reportIsEditable(calculatedStatus);

  return (
    <Section
      hidePrint={isUndefined(goals)}
      key="Goals"
      basePath="goals-objectives"
      anchor="goals-and-objectives"
      title="Goals summary"
      canEdit={canEdit}
    >
      {goals.map((goal) => {
        const objectives = goal.objectives || [];
        return (
          <div key={`review-${goal.id}`}>
            <div className="margin-bottom-3 desktop:margin-bottom-0 margin-top-2">
              <div>
                <span className="text-bold">Goal:</span>
                {' '}
                {goal.name}
                {goal.goalNumber && ` (${goal.goalNumber})`}
              </div>
              <div className="margin-top-2">
                <>
                  {objectives.map((objective) => (
                    <div key={objective.id} className="desktop:flex-align-end display-flex flex-column flex-justify-center margin-top-1">
                      <div>
                        <span className="text-bold">Objective:</span>
                        {' '}
                        {objective.title}
                      </div>
                      <div className="margin-top-1">
                        <span className="text-bold">Topics:</span>
                        {' '}
                        {
                          objective.topics.map((t) => t.name).join(', ')
                        }
                      </div>
                      <div className="margin-top-1">
                        <span className="text-bold">Resource links:</span>
                        {' '}
                        <ul className="usa-list usa-list--unstyled">
                          {objective.resources.map((r) => (
                            <li key={uuidv4()}>
                              <a href={r.value}>{r.value}</a>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="margin-top-1">
                        <span className="text-bold">Resource attachments:</span>
                        {' '}
                        {
                          objective.files.map((attachment) => (
                            <li key={attachment.url.url}>
                              <a
                                href={attachment.url.url}
                                target={attachment.originalFileName.endsWith('.txt') ? '_blank' : '_self'}
                                rel="noreferrer"
                              >
                                {
                                  `${attachment.originalFileName}
                                   ${attachment.originalFileName.endsWith('.txt')
                                    ? ' (opens in new tab)'
                                    : ''}`
                                }
                              </a>
                            </li>
                          ))
                        }
                      </div>
                      <div className="margin-top-1">
                        <span className="text-bold">Objective status:</span>
                        {' '}
                        {objective.status}
                      </div>
                      <div className="margin-top-1">
                        <span className="text-bold">TTA provided:</span>
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
  );
};

export default RecipientReviewSection;
