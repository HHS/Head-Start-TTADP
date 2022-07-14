/*
 * Copied from https://github.com/JedWatson/react-select/blob/master/packages/react-select/src/components/Option.js
 * Two changes:
 *  1) Removed `option--is-selected` so the selected item style is not applied to
 *     selected items
 *  2) Added a checkbox that is checked if the item is selected
 */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react';
import { Checkbox } from '@trussworks/react-uswds';

const Option = (props) => {
  const {
    children,
    className,
    cx,
    getStyles,
    isDisabled,
    isFocused,
    isSelected,
    innerRef,
    innerProps,
    data,
  } = props;

  const { number } = data;

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
      <div className="display-flex" style={{ whiteSpace: 'pre-wrap' }}>
        <Checkbox readOnly checked={isSelected} />

        <span>
          { number ? (
            <strong>
              {number}
              :
              {' '}
            </strong>
          ) : null }
          { children }
        </span>
      </div>
    </div>
  );
};

export default Option;
