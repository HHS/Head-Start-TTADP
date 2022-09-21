import React from 'react';
import PropTypes from 'prop-types';
import { Editor } from 'react-draft-wysiwyg';
import { v4 as uuidv4 } from 'uuid';
import { getEditorState } from '../../../utils';

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

export default function ApprovedReportSection({
  title,
  sections,
  className,
}) {
  return (
    <div className={className}>
      <h2>{title}</h2>
      {sections.map((section) => {
        const subheadings = Object.keys(section.data);
        return (
          <div key={section.heading || subheadings[0]}>
            { section.heading ? <h3>{section.heading}</h3> : null }
            {subheadings.map((subheading) => (
              <div key={subheading}>
                <p className="text-bold">{subheading}</p>
                <p>{renderData(subheading, section.data[subheading])}</p>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

ApprovedReportSection.propTypes = {
  className: PropTypes.string,
  title: PropTypes.string.isRequired,
  sections: PropTypes.arrayOf(PropTypes.shape({
    heading: PropTypes.string,
    // eslint-disable-next-line react/forbid-prop-types
    data: PropTypes.object.isRequired, // we are using an object here since we don't know the keys
  })).isRequired,
};

ApprovedReportSection.defaultProps = {
  className: '',
};
