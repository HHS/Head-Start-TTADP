/*
 * Copied from https://github.com/JedWatson/react-select/blob/master/packages/react-select/src/components/Option.js
 * Changes:
 *  - Removed `option--is-selected` so the selected item style is not applied to selected items
 */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react';

const Option = (props) => {
  const {
    children,
    className,
    cx,
    getStyles,
    isDisabled,
    isFocused,
    innerRef,
    innerProps,
    data,
  } = props;

  const { ids } = data;

  const label = ids ? ids.map((id) => `${id}`).join(', ') : '';

  return (
    <div
      style={getStyles('option', { ...props, isSelected: false })}
      className={cx(
        {
          option: true,
          'option--is-disabled': isDisabled,
          'option--is-focused': isFocused,
        },
        className,
      )}
      ref={innerRef}
      {...innerProps}
    >
      <div>
        { label ? (
          <strong>
            {label}
            :
            {' '}
          </strong>
        ) : null }
        { children }
      </div>
    </div>
  );
};

export default Option;
