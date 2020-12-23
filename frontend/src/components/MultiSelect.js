import React from 'react';
import PropTypes from 'prop-types';
import Select, { components } from 'react-select';
import { Label } from '@trussworks/react-uswds';
import { Controller } from 'react-hook-form';

import arrowBoth from '../images/arrow-both.svg';

const DropdownIndicator = (props) => (
  // eslint-disable-next-line react/jsx-props-no-spreading
  <components.DropdownIndicator {...props}>
    <img alt="" style={{ width: '8px' }} src={arrowBoth} />
  </components.DropdownIndicator>
);

const styles = {
  container: (provided, state) => {
    // To match the focus indicator provided by uswds
    const outline = state.isFocused ? '0.25rem solid #2491ff;' : '';
    return {
      ...provided,
      outline,
    };
  },
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

function MultiSelect({
  label, name, options, disabled, control, required,
}) {
  const findLabel = (value) => {
    const opt = options.find((o) => o.value === value);
    if (!opt) {
      return value;
    }
    return opt.label;
  };

  return (
    <Label>
      {label}
      <Controller
        render={({ onChange, value }) => {
          let values = value;
          if (value) {
            values = value.map((v) => ({
              value: v, label: findLabel(v),
            }));
          }
          return (
            <Select
              className="margin-top-1"
              id={name}
              value={values}
              onChange={(e) => {
                const newValue = e ? e.map((v) => v.value) : null;
                onChange(newValue);
              }}
              styles={styles}
              components={{ DropdownIndicator }}
              options={options}
              isDisabled={disabled}
              placeholder=""
              isMulti
            />
          );
        }}
        control={control}
        defaultValue={[]}
        rules={{
          required,
        }}
        name={name}
      />
    </Label>
  );
}

MultiSelect.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
      ]).isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  control: PropTypes.object.isRequired,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
};

MultiSelect.defaultProps = {
  disabled: false,
  required: true,
};

export default MultiSelect;
