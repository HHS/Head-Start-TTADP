import React from 'react';
import PropTypes from 'prop-types';
import { Editor } from 'react-draft-wysiwyg';
import { getEditorState } from '../../utils';
import './ReadOnlyObjective.scss';

const TTAProvided = ({ tta }) => {
  const defaultEditorState = getEditorState(tta);
  return (
    <div className="margin-bottom-2">
      <h4 className="margin-bottom-0">TTA provided</h4>
      <Editor
        readOnly
        className="margin-top-0"
        toolbarHidden
        defaultEditorState={defaultEditorState}
      />
    </div>
  );
};

TTAProvided.propTypes = {
  tta: PropTypes.string.isRequired,
};

export default function ReadOnlyObjective({ objective }) {
  return (
    <div className="ttahub-goal-form-objective-summary">
      <h3 className="margin-top-0 margin-bottom-2">Objective summary</h3>
      <div className="margin-bottom-2">
        <h4 className="margin-0">Objective</h4>
        <p className="usa-prose margin-0">{objective.title}</p>
      </div>

      {objective.topics && objective.topics.length
        ? (
          <div className="margin-bottom-2">
            <h4 className="margin-0">Topics</h4>
            <p className="usa-prose margin-0">{objective.topics.map((topic) => topic.label).join(', ')}</p>
          </div>
        ) : null }

      {objective.resources && objective.resources.length
        ? (
          <div className="margin-bottom-2">
            <h4 className="margin-0">Resource links</h4>
            <ul className="usa-list usa-list--unstyled">
              { objective.resources.map((resource) => (
                <li key={resource.key}>{resource.value}</li>
              ))}
            </ul>
          </div>
        )
        : null }

      {objective.files && objective.files.length
        ? (
          <div className="margin-bottom-2">
            <h4 className="margin-0">Resources</h4>
            <ul className="usa-list usa-list--unstyled">
              { objective.files.map((f) => {
                const fileName = f.originalFileName || f.path;

                if (f.url && f.url.url && !f.url.error) {
                  return (
                    <li key={fileName}>
                      <a href={f.url.url}>{fileName}</a>
                    </li>
                  );
                }

                return (
                  <li key={fileName}>
                    {fileName}
                  </li>
                );
              })}
            </ul>
          </div>
        )
        : null }

      {objective.ttaProvided ? <TTAProvided tta={objective.ttaProvided} /> : null}

      {objective.status
        ? (
          <div className="margin-bottom-2">
            <h4 className="margin-0">Status</h4>
            <p className="usa-prose margin-0">{objective.status}</p>
          </div>
        )
        : null }
    </div>
  );
}

ReadOnlyObjective.propTypes = {
  objective: PropTypes.shape({
    ttaProvided: PropTypes.string,
    resources: PropTypes.arrayOf(PropTypes.string),
    topics: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string,
    })),
    files: PropTypes.arrayOf(PropTypes.shape({
      originalFileName: PropTypes.string,
      path: PropTypes.string,
      fileSize: PropTypes.number,
      status: PropTypes.string,
      url: PropTypes.shape({
        url: PropTypes.string,
      }),
    })),
    title: PropTypes.string,
    id: PropTypes.number,
    status: PropTypes.string,
  }).isRequired,
};
