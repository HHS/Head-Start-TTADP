import React from 'react'
import PropTypes from 'prop-types'
import { Editor } from 'react-draft-wysiwyg'
import { uniqueId } from 'lodash'
import { getEditorState } from '../../utils'
import './ReadOnlyObjective.scss'
import ObjectiveStatusSuspendReason from '../ObjectiveStatusSuspendReason'

const TTAProvided = ({ tta }) => {
  const defaultEditorState = getEditorState(tta)
  return (
    <div className="margin-bottom-2">
      <h4 className="margin-bottom-0">TTA provided</h4>
      <Editor readOnly className="margin-top-0" toolbarHidden defaultEditorState={defaultEditorState} />
    </div>
  )
}

TTAProvided.propTypes = {
  tta: PropTypes.string.isRequired,
}

export default function ReadOnlyObjective({ objective }) {
  return (
    <div className="ttahub-goal-form-objective-summary">
      <h3 className="margin-top-0 margin-bottom-2">Objective summary</h3>
      <div className="margin-bottom-2">
        <h4 className="margin-0">TTA objective</h4>
        <p className="usa-prose margin-0">{objective.title}</p>
      </div>

      {objective.citations && objective.citations.length ? (
        <div className="margin-bottom-2">
          <h4 className="margin-0">Citations</h4>
          <p className="usa-prose margin-0">{objective.citations.map((citation) => citation.name).join(', ')}</p>
        </div>
      ) : null}

      {objective.topics && objective.topics.length ? (
        <div className="margin-bottom-2">
          <h4 className="margin-0">Topics</h4>
          <p className="usa-prose margin-0">{objective.topics.map((topic) => topic.name).join(', ')}</p>
        </div>
      ) : null}

      {objective.resources && objective.resources.length ? (
        <div className="margin-bottom-2">
          <h4 className="margin-0">Resource links</h4>
          <ul className="usa-list usa-list--unstyled resource-link-wrapper">
            {objective.resources.map((resource) => (
              <li key={resource.key}>{resource.value}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {objective.courses && objective.courses.length ? (
        <div className="margin-bottom-2">
          <h4 className="margin-0">iPD courses</h4>
          <ul className="usa-list usa-list--unstyled">
            {objective.courses.map((course) => (
              <li key={uniqueId('objective-course-')}>{course.name}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {objective.files && objective.files.length ? (
        <div className="margin-bottom-2">
          <h4 className="margin-0">Resource attachments</h4>
          <ul className="usa-list usa-list--unstyled">
            {objective.files.map((f) => {
              const fileName = f.originalFileName || f.path

              if (f.url && f.url.url && !f.url.error) {
                return (
                  <li key={fileName}>
                    <a href={f.url.url}>{fileName}</a>
                  </li>
                )
              }

              return <li key={fileName}>{fileName}</li>
            })}
          </ul>
        </div>
      ) : null}

      {objective.ttaProvided ? <TTAProvided tta={objective.ttaProvided} /> : null}

      {objective.supportType ? (
        <div className="margin-bottom-2">
          <h4 className="margin-0">Support type</h4>
          <p className="usa-prose margin-0">{objective.supportType}</p>
        </div>
      ) : null}

      {objective.status ? (
        <div className="margin-bottom-2">
          <h4 className="margin-0">Objective status</h4>
          <p className="usa-prose margin-0">{objective.status}</p>
        </div>
      ) : null}

      <ObjectiveStatusSuspendReason
        status={objective.status}
        closeSuspendReason={objective.closeSuspendReason}
        closeSuspendContext={objective.closeSuspendContext}
      />
    </div>
  )
}

ReadOnlyObjective.propTypes = {
  objective: PropTypes.shape({
    closeSuspendContext: PropTypes.string,
    closeSuspendReason: PropTypes.string,
    ttaProvided: PropTypes.string,
    resources: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string,
        value: PropTypes.string,
      })
    ),
    supportType: PropTypes.string,
    topics: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
      })
    ),
    citations: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
      })
    ),
    courses: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
      })
    ),
    files: PropTypes.arrayOf(
      PropTypes.shape({
        originalFileName: PropTypes.string,
        path: PropTypes.string,
        fileSize: PropTypes.number,
        status: PropTypes.string,
        url: PropTypes.shape({
          url: PropTypes.string,
        }),
      })
    ),
    title: PropTypes.string,
    id: PropTypes.number,
    status: PropTypes.string,
  }).isRequired,
}
