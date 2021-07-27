import React from 'react';
import PropTypes from 'prop-types';
import { Editor } from 'react-draft-wysiwyg';
import { getEditorState } from '../../../utils';
import './ViewTable.css';

function renderEditor(data) {
  const defaultEditorState = getEditorState(data || '');
  return (
    <Editor
      readOnly
      toolbarHidden
      defaultEditorState={defaultEditorState}
    />
  );
}

function renderData(data) {
  if (Array.isArray(data)) {
    return (
      <ul>
        {data.map((line) => renderEditor(line))}
      </ul>
    );
  }

  return renderEditor(data);
}

export default function ViewTable({
  caption, headings, data, className,
}) {
  return (
    <div className={`ttahub-activity-report-view-table-container margin-bottom-2 ${className}`}>
      <table className="ttahub-activity-report-view-table usa-table">
        <caption className="padding-y-1 padding-left-2">{caption}</caption>
        <tbody>
          { headings.map((heading, index) => (
            <tr key={`tr-${heading.toLowerCase().replace(' ', '-')}`}>
              <th scope="row">{heading}</th>
              <td>
                {data[index] ? renderData(data[index]) : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

ViewTable.propTypes = {
  className: PropTypes.string,
  caption: PropTypes.string.isRequired,
  headings: PropTypes.arrayOf(PropTypes.string).isRequired,
  data: PropTypes.arrayOf(
    PropTypes.oneOfType(
      [
        PropTypes.string,
        PropTypes.arrayOf(
          PropTypes.string,
        ),
      ],
    ),
  ),
};

ViewTable.defaultProps = {
  className: '',
  data: [],
};
