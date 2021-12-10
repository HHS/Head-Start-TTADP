import React from 'react';
import PropTypes from 'prop-types';
import Select, { components } from 'react-select';

// eslint-disable-next-line react/jsx-props-no-spreading
const MultiValue = (props) => <components.MultiValue {...props} />;

export default function FilterSelect({
  onApply,
  labelText,
  options,
}) {
  // useEffect(() => {
  //   /**
  //    * unfortunately, given our support for ie11, we can't
  //    * upgrade to react-select v5, which support a spellcheck
  //    * attribute. Here is an awkward solution I've concocted
  //    * in it's stead.
  //    */
  //   const input = document.querySelector(`#${inputId}`);
  //   if (input) {
  //     input.setAttribute('spellcheck', 'true');
  //   }
  // });

  const styles = {
    container: (provided, state) => {
      // To match the focus indicator provided by uswds
      const outline = state.isFocused ? '0.25rem solid #2491ff;' : '';
      return {
        ...provided,
        outline,
        height: 'auto',
      };
    },
    control: (provided, state) => {
      const selected = state.getValue();
      return {
        ...provided,
        background: state.isFocused || selected.length ? 'white' : 'transparent',
        border: 'none',
        borderRadius: 0,
        boxShadow: '0',
        // Match uswds disabled style
        opacity: state.isDisabled ? '0.7' : '1',

        overflow: 'hidden',
        position: !state.isFocused ? 'absolute' : 'relative',
        top: 0,
        left: 0,
        right: 0,
        bottom: state.isFocused && selected.length ? 'auto' : 0,
      };
    },
    indicatorsContainer: (provided) => ({
      ...provided,
      display: 'inline',
      // The arrow dropdown icon is too far to the right, this pushes it back to the left
      marginRight: '4px',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    menu: (provided) => ({
      ...provided,
      zIndex: 2,
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: 'transparent',
    }),
    multiValueContainer: (provided) => ({
      ...provided,
      overflow: 'hidden',
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      fontSize: '100%',
    }),
  };

  const onChange = (selected) => {
    onApply(selected.map((selection) => selection.label));
  };

  return (
    <Select
      label={labelText}
      onChange={onChange}
      options={options}
      styles={styles}
      components={{
        DropdownIndicator: null,
        MultiValue,
      }}
      className="usa-select"
      closeMenuOnSelect={false}
      isMulti
    />
  );
}

FilterSelect.propTypes = {
  onApply: PropTypes.func.isRequired,
  labelText: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  })).isRequired,
};
