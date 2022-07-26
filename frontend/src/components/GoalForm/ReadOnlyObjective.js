import React from 'react';
import PropTypes from 'prop-types';
import { Editor } from 'react-draft-wysiwyg';
import { getEditorState } from '../../utils';

const TTAProvided = ({ tta }) => {
  const defaultEditorState = getEditorState(tta);
  return (
    <>
      <h4 className="margin-bottom-1">TTA provided</h4>
      <Editor
        readOnly
        className="margin-top-0"
        toolbarHidden
        defaultEditorState={defaultEditorState}
      />
    </>
  );
};

TTAProvided.propTypes = {
  tta: PropTypes.string.isRequired,
};

export default function ReadOnlyObjective({ objective }) {
  return (
    <div>
      <h3>Objective summary</h3>
      <h4 className="margin-bottom-1">Objective</h4>
      <p className="margin-top-0">{objective.title}</p>

      {objective.topics && objective.topics.length
        ? (
          <>
            <h4 className="margin-bottom-1">Topics</h4>
            <p className="margin-top-0">{objective.topics.map((topic) => topic.label).join(', ')}</p>
          </>
        ) : null }

      {objective.resources && objective.resources.length
        ? (
          <>
            <h4 className="margin-bottom-1">Resource links</h4>
            <ul className="usa-list usa-list--unstyled">
              { objective.resources.map((resource) => (
                <li key={resource.key}>{resource.value}</li>
              ))}
            </ul>
          </>
        )
        : null }

      {objective.files && objective.files.length
        ? (
          <>
            <h4 className="margin-bottom-1">Resources</h4>
            <ul className="usa-list usa-list--unstyled">
              { objective.files.map((f) => (
                <li key={f.originalFileName}>{f.originalFileName}</li>
              ))}
            </ul>
          </>
        )
        : null }

      {objective.roles && objective.roles.length
        ? (
          <>
            <h4 className="margin-bottom-1">Specialist roles</h4>
            <ul className="usa-list usa-list--unstyled">
              { objective.roles.map((role) => (
                <li key={role}>{role}</li>
              ))}
            </ul>
          </>
        )
        : null }

      {objective.ttaProvided ? <TTAProvided tta={objective.ttaProvided} /> : null}
    </div>
  );
}

ReadOnlyObjective.propTypes = {
  objective: PropTypes.shape({
    roles: PropTypes.arrayOf(PropTypes.string),
    ttaProvided: PropTypes.string,
    resources: PropTypes.arrayOf(PropTypes.string),
    topics: PropTypes.arrayOf(PropTypes.string),
    files: PropTypes.arrayOf(PropTypes.shape({
      originalFileName: PropTypes.string,
      fileSize: PropTypes.number,
      status: PropTypes.string,
      url: PropTypes.shape({
        url: PropTypes.string,
      }),
    })),
    title: PropTypes.string,
    id: PropTypes.number,
  }).isRequired,
};
