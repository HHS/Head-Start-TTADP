import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Editor } from 'react-draft-wysiwyg';
import { v4 as uuidv4 } from 'uuid';
import { getEditorState } from '../../../utils';
import './ViewTable.css';

function renderEditor(data) {
  /**
   * sometimes, we may receive JSX
   */
  if (typeof data === 'object') {
    return data;
  }

  /**
   * otherwise, we render the contents via react-draft
   */
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
        {data.map((line) => <Fragment key={uuidv4()}>{renderEditor(line)}</Fragment>)}
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
        PropTypes.node,
        PropTypes.arrayOf(
          PropTypes.node,
        ),
      ],
    ),
  ),
};

ViewTable.defaultProps = {
  className: '',
  data: [],
};
