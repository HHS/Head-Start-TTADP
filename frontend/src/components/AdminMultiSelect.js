/* eslint-disable react/forbid-prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { Label } from '@trussworks/react-uswds';
import Select, { components } from 'react-select';
import colors from '../colors';
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
    const outline = state.isFocused ? `0.25rem solid ${colors.blueVividFocus};` : '';
    return {
      ...provided,
      outline,
    };
  },
  control: (provided) => ({
    ...provided,
    borderColor: colors.baseDark,
    backgroundColor: 'white',
    borderRadius: '0',
    '&:hover': {
      borderColor: colors.baseDark,
    },
  }),
  indicatorSeparator: () => ({ display: 'none' }),
};

const getValues = (value) => (value.map((v) => ({
  value: v, label: v,
})));

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
          closeMenuOnSelect={false}
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
  // eslint-disable-next-line react/forbid-prop-types
  options: PropTypes.arrayOf(PropTypes.object).isRequired,
};

AdminMultiSelect.defaultProps = {
  value: ['default'],
  placeholder: 'Select...',
};

export default AdminMultiSelect;
