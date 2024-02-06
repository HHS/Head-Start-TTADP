import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Textarea,
} from '@trussworks/react-uswds';

const DEFAULT_TEXTAREA_HEIGHT = 160;

export default function AutomaticResizingTextarea({
  onUpdateText, onBlur, inputName, disabled, value, className, asyncOnChange,
}) {
  const [height, setHeight] = useState(`${DEFAULT_TEXTAREA_HEIGHT}px`);

  const autoResize = (e) => {
    if (e.target && e.target.scrollHeight && e.target.scrollHeight > DEFAULT_TEXTAREA_HEIGHT) {
      setHeight(`${e.target.scrollHeight}px`);
    }
  };

  const onChange = (e) => {
    autoResize(e);
    onUpdateText(e);
  };

  const asyncHandler = async (e) => {
    autoResize(e);
    await onUpdateText(e);
  };

  return (
    <Textarea
      className={className}
      onBlur={onBlur}
      id={inputName}
      name={inputName}
      value={value}
      onChange={asyncOnChange ? asyncHandler : onChange}
      required
      disabled={disabled}
      style={{ height }}
    />
  );
}

AutomaticResizingTextarea.propTypes = {
  onUpdateText: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
  inputName: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  value: PropTypes.string.isRequired,
  className: PropTypes.string,
  asyncOnChange: PropTypes.bool,
};

AutomaticResizingTextarea.defaultProps = {
  disabled: false,
  className: '',
  asyncOnChange: false,
};
