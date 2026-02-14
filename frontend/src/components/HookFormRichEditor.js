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

import React from 'react'
import PropTypes from 'prop-types'
import { Controller } from 'react-hook-form'
import RichEditor from './RichEditor'
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css'

/**
 * Component that wraps the RichEditor in a react-hook-form controller
 *
 * Args:
 * name: Name of the form item
 * defaultValue: Default value for the editor
 * ariaLabel: Label describing the editor read by a screen reader
 */
const HookFormRichEditor = ({ name, id, defaultValue, ariaLabel, required, errorMessage }) => (
  <Controller
    name={name}
    id={id}
    defaultValue={defaultValue}
    rules={
      required
        ? {
            validate: {
              notEmptyTag: (value) =>
                (value && value.trim() !== '<p></p>') || errorMessage || 'This field is required',
            },
          }
        : {}
    }
    render={({ onChange, value, onBlur }) => (
      <RichEditor value={value} onChange={onChange} onBlur={onBlur} ariaLabel={ariaLabel} />
    )}
  />
)

HookFormRichEditor.propTypes = {
  name: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  defaultValue: PropTypes.string,
  ariaLabel: PropTypes.string.isRequired,
  required: PropTypes.bool,
  errorMessage: PropTypes.string,
}

HookFormRichEditor.defaultProps = {
  defaultValue: '',
  required: false,
  errorMessage: null,
}
export default HookFormRichEditor
