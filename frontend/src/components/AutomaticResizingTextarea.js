import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Textarea } from '@trussworks/react-uswds'

const DEFAULT_TEXTAREA_HEIGHT = 160

export default function AutomaticResizingTextarea({ onUpdateText, onBlur, inputName, disabled, value, className }) {
  const [height, setHeight] = useState(`${DEFAULT_TEXTAREA_HEIGHT}px`)

  return (
    <Textarea
      className={`${className} ttahub-automatic-resizing-textarea`}
      onBlur={onBlur}
      id={inputName}
      name={inputName}
      value={value}
      onChange={onUpdateText}
      required
      disabled={disabled}
      style={{ height }}
      onPaste={(e) => {
        // We don't need to resize on every on change... doing so seems
        // to create a performance problem

        // instead, we can solve the user issue by resizing on paste
        // only - we wrap in a setTimeout to execute the resize after
        // the value has been updated
        setTimeout(() => {
          /* istanbul ignore next: can't test with jest */
          if (e.target && e.target.scrollHeight && e.target.scrollHeight > DEFAULT_TEXTAREA_HEIGHT) {
            setHeight(`${e.target.scrollHeight}px`)
          }
        }, 0)
      }}
    />
  )
}

AutomaticResizingTextarea.propTypes = {
  onUpdateText: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
  inputName: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  value: PropTypes.string.isRequired,
  className: PropTypes.string,
}

AutomaticResizingTextarea.defaultProps = {
  disabled: false,
  className: '',
}
