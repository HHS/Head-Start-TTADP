/*
 * Copied from https://github.com/JedWatson/react-select/blob/master/packages/react-select/src/components/Input.js
 * Note the multiselect component must have controlShouldRenderValue set to false
 * when using this input.
 */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react';
import AutosizeInput from 'react-input-autosize';

import './GoalInput.css';

const inputStyle = (isHidden) => ({
  label: 'input',
  background: 0,
  border: 0,
  fontSize: 'inherit',
  opacity: isHidden ? 0 : 1,
  outline: 0,
  padding: 0,
  color: 'inherit',
  width: '100%',
});

const Input = ({
  className,
  cx,
  getStyles,
  innerRef,
  isHidden,
  isDisabled,
  theme,
  selectProps,
  ...props
}) => {
  const selectedGoals = selectProps.value.length;
  let message;

  const { value } = props;

  if (value !== '') {
    message = '';
  } else if (selectedGoals === 0) {
    message = 'Select goal(s) or type here to create a new goal';
  } else if (selectedGoals === 1) {
    message = '1 goal selected';
  } else {
    message = `${selectedGoals} goals selected`;
  }

  const cssClasses = `${cx({ input: true }, className)} width-full smart-hub--dark-placeholder`;

  return (
    <>
      <AutosizeInput
        className={cssClasses}
        inputRef={innerRef}
        inputStyle={inputStyle(isHidden)}
        disabled={isDisabled}
        placeholder={message}
        {...props}
      />
    </>
  );
};

export default Input;
