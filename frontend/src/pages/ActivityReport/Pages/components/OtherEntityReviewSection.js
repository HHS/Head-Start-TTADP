import React from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useFormContext } from 'react-hook-form'
import { isUndefined } from 'lodash'
import { Editor } from 'react-draft-wysiwyg'
import { getEditorState, reportIsEditable } from '../../../../utils'

import Section from '../Review/ReviewSection'
import AttachmentReviewSection from './AttachmentReviewSection'

const OtherEntityReviewSection = () => {
  const { watch } = useFormContext()
  const { objectivesWithoutGoals, calculatedStatus } = watch()

  const canEdit = reportIsEditable(calculatedStatus)

  return (
    <Section
      hidePrint={isUndefined(objectivesWithoutGoals)}
      key="Objectives"
      basePath="goals-objectives"
      anchor="goals-and-objectives"
      title="Objective summary"
      canEdit={canEdit}
    >
      <>
        {objectivesWithoutGoals.map((objective) => (
          <div key={objective.id} className="desktop:flex-align-end display-flex flex-column flex-justify-center margin-top-1">
            <div>
              <span className="text-bold">TTA Objective:</span> {objective.title}
            </div>
            <div className="margin-top-1">
              <span className="text-bold">Topics:</span> {objective.topics.map((t) => t.name).join(', ')}
            </div>
            <div className="margin-top-1">
              <span className="text-bold">Resource links:</span>{' '}
              <ul className="usa-list usa-list--unstyled">
                {objective.resources.map((r) => (
                  <li key={uuidv4()}>
                    <a href={r.url}>{r.url}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="margin-top-1">
              <span className="text-bold">iPD courses:</span> {objective.courses.map((c) => c.name).join(', ')}
            </div>
            <AttachmentReviewSection attachments={objective.files} />
            <div className="margin-top-1">
              <span className="text-bold">TTA provided:</span>{' '}
              <Editor readOnly toolbarHidden defaultEditorState={getEditorState(objective.ttaProvided)} ariaLabel="TTA provided" />
            </div>
            {objective.supportType && (
              <div className="margin-top-1">
                <span className="text-bold">Support type:</span> {objective.supportType}
              </div>
            )}
            <div className="margin-top-1">
              <span className="text-bold">Objective status:</span> {objective.status}
            </div>
          </div>
        ))}
      </>
    </Section>
  )
}

export default OtherEntityReviewSection
