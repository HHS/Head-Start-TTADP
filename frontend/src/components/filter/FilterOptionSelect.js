import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';

export default function FilterOptionSelect({
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
      border: 'none',
      // Match uswds disabled style
      opacity: state.isDisabled ? '0.7' : '1',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    }),
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
      }}
      className="usa-select"
      isMulti
    />
  );
}

FilterOptionSelect.propTypes = {
  onApply: PropTypes.func.isRequired,
  labelText: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  })).isRequired,
};
