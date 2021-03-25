import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import htmlToDraft from 'html-to-draftjs';
import { EditorState, ContentState } from 'draft-js';
import { Editor } from 'react-draft-wysiwyg';

/**
 * A near identical copy of `ReviewItem` but specifically for the Rich Editor.
 * Reasoning for another component is to not overload `ReviewItem`
 */

const HtmlReviewItem = ({ label, name, path }) => {
  const { watch } = useFormContext();
  const value = watch(name);
  let values = value;

  if (!Array.isArray(value)) {
    values = [value];
  }

  if (path) {
    values = values.map((v) => _.get(v, path));
  }

  values = values.map((v) => {
    const { contentBlocks, entityMap } = htmlToDraft(v);
    const contentState = ContentState.createFromBlockArray(contentBlocks, entityMap);
    const defaultEditorState = EditorState.createWithContent(contentState);
    return (
      <Editor
        readOnly
        toolbarHidden
        defaultEditorState={defaultEditorState}
      />
    );
  });

  const emptySelector = value && value.length > 0 ? '' : 'smart-hub-review-item--empty';
  const classes = ['margin-top-1', emptySelector].filter((x) => x !== '').join(' ');

  return (
    <div className={`grid-row ${classes} margin-bottom-3 desktop:margin-bottom-0`}>
      <div className="grid-col-12 desktop:grid-col-6 print:grid-col-6  font-sans-2xs desktop:font-sans-sm text-bold desktop:text-normal">
        {label}
      </div>
      <div className="grid-col-12 desktop:grid-col-6 print:grid-col-6">
        {values.map((v, index) => (
          <div aria-label={`${label} ${index + 1}`} key={`${label}${v}`} col={12} className="desktop:flex-align-end display-flex flex-column flex-justify-center">
            {v}
          </div>
        ))}
      </div>
    </div>
  );
};

HtmlReviewItem.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  path: PropTypes.string,
};

HtmlReviewItem.defaultProps = {
  path: '',
};

export default HtmlReviewItem;
