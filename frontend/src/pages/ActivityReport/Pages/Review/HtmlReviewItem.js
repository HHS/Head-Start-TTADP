/* istanbul ignore file: hard to test due to rich editor */
import React from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';
import { Editor } from 'react-draft-wysiwyg';
import { getEditorState } from '../../../../utils';

/**
 * A near identical copy of `ReviewItem` but specifically for the Rich Editor.
 * Reasoning for another component is to not overload `ReviewItem`
 */

/* istanbul ignore next: hard to test without setting up a form context */
const HtmlReviewItem = ({ label, name }) => {
  const { watch } = useFormContext();
  const value = watch(name);
  let values = value;

  if (!Array.isArray(value)) {
    values = [value];
  }

  values = values.map((v, index) => {
    // eslint-disable-next-line no-param-reassign
    if (v === '<p></p>' || v === '') v = 'None provided';
    const defaultEditorState = getEditorState(v || 'None provided');
    return (
      <Editor
        readOnly
        toolbarHidden
        defaultEditorState={defaultEditorState}
        ariaLabel={values.length > 1 ? `${label} ${index + 1}` : label}
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
          <div aria-label={`${label} ${index + 1}`} key={`${label}${v}`} className="desktop:flex-align-end display-flex flex-column flex-justify-center">
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
};

export default HtmlReviewItem;
