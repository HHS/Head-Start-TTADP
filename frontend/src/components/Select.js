import React from 'react';
import PropTypes from 'prop-types';
import ReactSelect from 'react-select';

import { DropdownIndicator } from './MultiSelect';

function Select({
  name,
  options,
  onChange,
  value,
  className,
}) {
  const styles = {
    container: (provided, state) => {
      // To match the focus indicator provided by uswds
      const outline = state.isFocused ? '0.25rem solid #2491ff;' : '';
      return {
        ...provided,
        outline,
      };
    },
    groupHeading: (provided) => ({
      ...provided,
      fontWeight: 'bold',
      fontFamily: 'SourceSansPro',
      textTransform: 'capitalize',
      fontSize: '14px',
      color: '#21272d',
      lineHeight: '22px',
    }),
    control: (provided, state) => ({
      ...provided,
      borderColor: '#565c65',
      backgroundColor: 'white',
      borderRadius: '0',
      '&:hover': {
        borderColor: '#565c65',
      },
      // Match uswds disabled style
      opacity: state.isDisabled ? '0.7' : '1',
    }),
    indicatorsContainer: (provided) => ({
      ...provided,
      // The arrow dropdown icon is too far to the right, this pushes it back to the left
      marginRight: '4px',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
  };

  return (
    <ReactSelect
      className={className}
      inputId={name}
      value={value}
      onChange={onChange}
      styles={styles}
      components={{ DropdownIndicator }}
      options={options}
    />
  );
}

const value = PropTypes.oneOfType([
  PropTypes.string,
  PropTypes.number,
]);

Select.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          label: PropTypes.string.isRequired,
          value: value.isRequired,
        }),
      ),
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  className: PropTypes.string,
};

Select.defaultProps = {
  className: '',
};

export default Select;
