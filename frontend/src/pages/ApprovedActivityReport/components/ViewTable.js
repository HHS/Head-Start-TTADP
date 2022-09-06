import React from 'react';
import PropTypes from 'prop-types';
import { Editor } from 'react-draft-wysiwyg';
import { v4 as uuidv4 } from 'uuid';
import { getEditorState } from '../../../utils';
import './ViewTable.scss';

function renderEditor(heading, data) {
  /**
   * sometimes, we may receive JSX
   */
  if (typeof data === 'object') {
    return data;
  }

  let wrapperId = '';

  if (typeof heading === 'string') {
    wrapperId = `${heading.toLowerCase().replace(' ', '-')}-${uuidv4()}`;
  } else {
    wrapperId = uuidv4();
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
      wrapperId={wrapperId}
    />
  );
}

function renderData(heading, data) {
  if (Array.isArray(data)) {
    const cleanData = data.filter((d) => d);
    return (
      <ul>
        {cleanData.map((line) => <li key={uuidv4()} className="margin-bottom-1">{renderEditor(heading, line)}</li>)}
      </ul>
    );
  }

  return renderEditor(heading, data);
}

export default function ViewTable({
  caption, headings, data, className, allowBreakWithin,
}) {
  return (
    <div className={`ttahub-activity-report-view-table-container margin-bottom-2 ${className}`}>
      <table className={`ttahub-activity-report-view-table usa-table usa-table--striped ${allowBreakWithin ? 'allow-break-within' : 'no-break-within'}`}>
        <caption className="padding-y-1 padding-left-2">{caption}</caption>
        <tbody>
          {headings.map((heading, index) => (
            <tr key={uuidv4()}>
              <th scope="row">{heading}</th>
              <td>
                {data[index] ? renderData(heading, data[index]) : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

ViewTable.propTypes = {
  allowBreakWithin: PropTypes.bool,
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
  allowBreakWithin: true,
  className: '',
  data: [],
};
