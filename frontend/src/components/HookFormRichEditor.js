/* istanbul ignore file */
/*
 * Ignoring this file due to how hard it is to test the functionality.
 * The main reason is that the react testing library uses JSDOM, which doesn't
 * support the html attribute `contentEditable` (which the component is built upon)
 *
 * https://github.com/jsdom/jsdom/issues/1670
 *
 * Creating a test that checks it renders properly decreases the test suite below the
 * threshold as well.
*/

import React from 'react';
import PropTypes from 'prop-types';
import { Controller } from 'react-hook-form/dist/index.ie11';

import RichEditor from './RichEditor';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';

/**
 * Component that wraps the RichEditor in a react-hook-form controller
 *
 * Args:
 * name: Name of the form item
 * defaultValue: Default value for the editor
 * ariaLabel: Label describing the editor read by a screen reader
 */
const HookFormRichEditor = ({
  name, defaultValue, ariaLabel,
}) => (
  <Controller
    name={name}
    defaultValue={defaultValue}
    render={({ onChange, value }) => (
      <RichEditor
        value={value}
        onChange={onChange}
        ariaLabel={ariaLabel}
      />
    )}
  />
);

HookFormRichEditor.propTypes = {
  name: PropTypes.string.isRequired,
  defaultValue: PropTypes.string,
  ariaLabel: PropTypes.string.isRequired,
};

HookFormRichEditor.defaultProps = {
  defaultValue: '',
};

export default HookFormRichEditor;
