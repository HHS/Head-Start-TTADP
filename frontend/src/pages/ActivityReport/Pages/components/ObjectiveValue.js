/*
 * Copied from https://github.com/JedWatson/react-select/blob/master/packages/react-select/src/components/SingleValue.tsx
 * Changes:
 * - Show the objective id when selected
 */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react';

const SingleValue = (
  props,
) => {
  const {
    children, className, cx, data, getStyles, isDisabled, innerProps,
  } = props;

  const { ids } = data;

  const label = ids ? ids.map((id) => `${id}`).join(', ') : '';

  return (
    <div
      style={getStyles('singleValue', props)}
      className={cx(
        {
          'single-value': true,
          'single-value--is-disabled': isDisabled,
        },
        className,
      )}
      {...innerProps}
    >
      { label ? (
        <strong>
          {label}
          :
          {' '}
        </strong>
      ) : null }
      { children }
    </div>
  );
};

export default SingleValue;
