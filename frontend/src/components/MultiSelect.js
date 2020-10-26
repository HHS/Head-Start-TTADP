/*

*/
import React from 'react';
import PropTypes from 'prop-types';
import { Label } from '@trussworks/react-uswds';
import { Controller } from 'react-hook-form';
import Select, { components } from 'react-select';

import './MultiSelect.css';

const DropdownIndicator = (props) => (
  // eslint-disable-next-line react/jsx-props-no-spreading
  <components.DropdownIndicator {...props}>
    <div className="smart-hub--select-icon" />
  </components.DropdownIndicator>
);

const MultiSelect = ({
  disabled, control, options, name, label, placeholder,
}) => (
  <>
    <Label htmlFor={name}>{label}</Label>
    <Controller
      render={({ onChange, value }) => (
        <Select
          isDisabled={disabled}
          isMulti
          onChange={onChange}
          value={value}
          placeholder={placeholder}
          components={{ DropdownIndicator }}
          styles={{
            indicatorSeparator: () => ({}),
            control: (provided, state) => ({
              ...provided,
              borderColor: '#565c65',
              borderRadius: '0px',
              backgroundColor: 'white',
              opacity: state.isDisabled ? 0.7 : 1,
            }),
          }}
        />
      )}
      control={control}
      options={options}
      id={name}
      name={name}
    />
  </>
);

MultiSelect.propTypes = {
  disabled: PropTypes.bool,
  // eslint-disable-next-line react/forbid-prop-types
  control: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  placeholder: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  })).isRequired,
};

MultiSelect.defaultProps = {
  disabled: false,
};

export default MultiSelect;
