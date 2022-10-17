import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Textarea,
} from '@trussworks/react-uswds';

const DEFAULT_TEXTAREA_HEIGHT = 160;

export default function AutomaticResizingTextarea({
  onUpdateText, onBlur, inputName, disabled, value,
}) {
  const [height, setHeight] = useState(`${DEFAULT_TEXTAREA_HEIGHT}px`);
  const onChange = (e) => {
    if (e.target && e.target.scrollHeight && e.target.scrollHeight > DEFAULT_TEXTAREA_HEIGHT) {
      setHeight(`${e.target.scrollHeight}px`);
    }
    onUpdateText(e);
  };

  return (
    <Textarea
      onBlur={onBlur}
      id={inputName}
      name={inputName}
      value={value}
      onChange={onChange}
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
};

AutomaticResizingTextarea.defaultProps = {
  disabled: false,
};
