/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react';
// import PropTypes from 'prop-types';

const FilterSelectContainer = (props) => {
  const {
    children,
    className,
    cx,
    getStyles,
    innerProps,
    isDisabled,
    getValue,
    isRtl,
    selectProps,
  } = props;

  const styles = getStyles('container', props);

  const currentSelected = getValue();
  const showTruncated = currentSelected.length > 1;

  if (showTruncated) {
    // console.log(currentSelected);

    return (
      <div
        style={styles}
        className={cx(
          {
            '--is-disabled': isDisabled,
            '--is-rtl': isRtl,
          },
          className,
        )}
        {...innerProps}
      >
        {currentSelected.map((selection, selectionIndex) => {
          if (selectionIndex === 0) {
            const label = selection.label.length > 18
              ? `${selection.label.slice(0, 10)}...${selection.label.slice(-3)}` : selection.label;
            return (
              <span {...props} selectProps={selectProps} key={selection.value}>{label}</span>
            );
          }

          if (selectionIndex === 1) {
            return (
              <span key={selection.value}>
                +
                {' '}
                {currentSelected.length - 1}
                {' '}
                more tags
              </span>
            );
          }

          return null;
        })}
      </div>
    );
  }

  return (
    <div
      style={styles}
      className={cx(
        {
          '--is-disabled': isDisabled,
          '--is-rtl': isRtl,
        },
        className,
      )}
      {...innerProps}
    >
      {children}
    </div>
  );
};

export default FilterSelectContainer;
