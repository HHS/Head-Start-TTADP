import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import useSpellCheck from '../../hooks/useSpellCheck';
import './FilterSelect.css';

export default function FilterSelect({
  onApply,
  labelText,
  inputId,
  options,
  selectedValues,
  mapByValue,
}) {
  /**
   * unfortunately, given our support for ie11, we can't
   * upgrade to react-select v5, which support a spellcheck
   * attribute. Here is an awkward solution I've concocted
   * in it's stead.
  */

  useSpellCheck(inputId);

  const key = mapByValue ? 'value' : 'label';

  const value = [selectedValues].flat().map((selection) => (
    options.find((option) => option[key] === selection)
  ));

  const styles = {
    container: (provided, state) => {
      // To match the focus indicator provided by uswds
      const outline = state.isFocused ? '0.25rem solid #2491ff' : '';
      return {
        ...provided,
        outline,
        height: 'auto',
        padding: 0,
        position: !state.isFocused ? 'absolute' : 'relative',
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
        overflow: state.isFocused ? 'visible' : 'hidden',
        maxHeight: state.isFocused ? 'auto' : '40px',
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
    }),
    valueContainer: (provided) => ({
      ...provided,
      maxHeight: '100%',
    }),
  };

  const onChange = (selected) => {
    onApply(selected.map((selection) => selection[key]));
  };

  const showTruncated = selectedValues.length > 1;

  let coverAll = () => <></>;

  if (showTruncated) {
    coverAll = () => {
      let charCount = 0;
      let andMoreShown = false;

      const truncated = selectedValues.map((selection, index) => {
        // if the "and x more tags" message has been shown
        if (andMoreShown) {
          return null;
        }

        // keep a running total of the characters, but we always have to show the first one
        if (index === 0 || charCount + selection.length < 18) {
          const label = selection.length > 18
            ? `${selection.slice(0, 9)}...${selection.slice(-5)}` : selection;

          charCount += label.length;

          return (
            <span key={selection} className="ttahub-filter-select--label flex-align-self-center">{label}</span>
          );
        }

        andMoreShown = true;

        return (
          <span key={selection} className="ttahub-filter-select--label flex-align-self-center">
            +
            {' '}
            {selectedValues.length - index}
            {' '}
            more tag
            {selectedValues.length - index > 1 ? 's' : ''}
          </span>
        );
      });

      return andMoreShown ? (
        <div className="ttahub-filter-select--cover-all position-absolute padding-x-1">
          {truncated}
        </div>
      ) : <></>;
    };
  }

  return (
    <div className={`ttahub-filter-select position-relative ${coverAll().props.children ? 'ttahub-filter-select__has-cover-all' : ''}`}>
      <Select
        placeholder={labelText}
        aria-label={labelText}
        inputId={inputId}
        onChange={onChange}
        options={options}
        styles={styles}
        classNamePrefix="ttahub-filter-select"
        components={{
          DropdownIndicator: null,
        }}
        className="usa-select"
        closeMenuOnSelect={false}
        value={value}
        isMulti
        menuShouldScrollIntoView={false}
      />
      {coverAll()}
    </div>
  );
}

const option = PropTypes.shape({
  label: PropTypes.string,
  value: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]),
});

FilterSelect.propTypes = {
  onApply: PropTypes.func.isRequired,
  labelText: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(option).isRequired,
  inputId: PropTypes.string.isRequired,
  selectedValues: PropTypes.arrayOf(PropTypes.string).isRequired,
  mapByValue: PropTypes.bool,
};

FilterSelect.defaultProps = {
  mapByValue: false,
};
