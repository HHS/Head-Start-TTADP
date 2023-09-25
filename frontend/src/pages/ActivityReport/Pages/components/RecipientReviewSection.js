import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useFormContext } from 'react-hook-form';
import { isUndefined } from 'lodash';
import { Editor } from 'react-draft-wysiwyg';
import { getEditorState, reportIsEditable } from '../../../../utils';
import Section from '../Review/ReviewSection';
import './RecipientReviewSection.scss';
import AttachmentReviewSection from './AttachmentReviewSection';

const RecipientReviewSection = () => {
  const { watch } = useFormContext();
  const {
    goalsAndObjectives,
    calculatedStatus,
  } = watch();

  const canEdit = reportIsEditable(calculatedStatus);

  const goals = goalsAndObjectives || [];

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
              <div className="margin-top-1">
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
                      <AttachmentReviewSection attachments={objective.files} />
                      <div className="margin-top-1">
                        <span className="text-bold">Objective status:</span>
                        {' '}
                        {objective.status}
                      </div>
                      { objective.status === 'Suspended' && objective.suspendReason && (
                        <div className="margin-top-1">
                          <span className="text-bold">Reason suspended:</span>
                          {' '}
                          {objective.suspendReason}
                          {objective.suspendContext && (` - ${objective.suspendContext}`)}
                        </div>
                      )}
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
