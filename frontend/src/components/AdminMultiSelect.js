/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { Label } from '@trussworks/react-uswds';
import Select, { components } from 'react-select';

import arrowBoth from '../images/arrow-both.svg';

const DropdownIndicator = (props) => (
  <components.DropdownIndicator {...props}>
    <img alt="" style={{ width: '8px' }} src={arrowBoth} />
  </components.DropdownIndicator>
);

const Placeholder = (props) => <components.Placeholder {...props} />;

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
  indicatorSeparator: () => ({ display: 'none' }),
  placeholder: () => ({ color: '#1D1D1D' }),
};

const getValues = (value) => (Array.isArray(value) ? value.map((v) => ({
  value: v, label: v,
})) : { value, label: value });

function AdminMultiSelect({
  id, name, value, onChange, placeholder, label, options,
}) {
  return (
    <>
      <Label htmlFor={id}>{label}</Label>
      <div className="margin-top-1">
        <Select
          id={id}
          isMulti
          options={options}
          onChange={onChange}
          name={name}
          value={getValues(value)}
          styles={styles}
          components={{ Placeholder, DropdownIndicator }}
          placeholder={placeholder}
        />
      </div>
    </>
  );
}

AdminMultiSelect.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  label: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.object).isRequired,
};

AdminMultiSelect.defaultProps = {
  value: ['default'],
  placeholder: 'Select...',
};

export default AdminMultiSelect;
