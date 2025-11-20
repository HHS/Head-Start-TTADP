import React, { useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { useController } from 'react-hook-form';
import _ from 'lodash';
import { DropdownIndicator, sortSelect, styles } from '../../../../../../components/MultiSelect';
import useExistingApprovers from '../../../../../../hooks/useExistingApprovers';

function ApproverSelect({
  name,
  options,
  labelProperty,
  valueProperty,
  filterInitialValue = false,
  required = true,
}) {
  let rules = {};

  if (required) {
    rules = {
      validate: {
        notEmpty: (value) => (value && value.length) || 'Select at least one manager',
      },
    };
  }

  const {
    field: {
      onChange: onSelect,
      value: selectValue,
      onBlur: onBlurSelect,
    },
  } = useController({
    name,
    rules,
    defaultValue: null,
  });

  const { filteredOptions, filteredValues } = useExistingApprovers(options);

  const initialValueRef = useRef(selectValue);

  const opts = useMemo(() => {
    if (!filterInitialValue || !initialValueRef.current) {
      return options;
    }

    return filteredOptions;
  }, [filterInitialValue, filteredOptions, options]);

  /*
   * @param {Array<string> || Array<object>} - value array. Either an array of strings or array
   * of objects
   * @returns {Array<{ label: string, value: string }>} - values array in format required by
   * react-select
   */
  const getValues = (value) => {
    if (!value) {
      return [];
    }

    // Filter out initial values from display if filterInitialValue is true
    if (filterInitialValue) {
      return filteredValues;
    }

    return value.map((item) => ({
      ...item,
      label: _.get(item, labelProperty),
      value: _.get(item, valueProperty),
    }));
  };

  /*
   * @param {*} - event. Contains values in the react-select format, an array of
   * `{ label: x, value: y }` objects
   * @param {func} - controllerOnChange. On change function from react-hook-form, to be called
   * the values in the format to be used outside of this component (not the react-select format)
   */
  const onChange = (newValues) => {
    // sorts alphabetically by label
    newValues.sort(sortSelect);
    const mappedNewValues = newValues.map((item) => {
      const tempItem = { ...item };
      _.set(tempItem, labelProperty, item.label);
      _.set(tempItem, valueProperty, item.value);
      return tempItem;
    });
    onSelect(mappedNewValues);
  };

  return (
    <Select
      onBlur={onBlurSelect}
      className="ttahub-multi-select margin-top-1"
      id={`${name}-container`}
      value={getValues(selectValue)}
      onChange={onChange}
      inputId={name}
      styles={styles()}
      components={{ DropdownIndicator }}
      options={opts}
      tabSelectsValue={false}
      isClearable={false}
      closeMenuOnSelect={false}
      hideSelectedOptions
      placeholder=""
      required={required}
      isMulti
    />
  );
}

const value = PropTypes.oneOfType([
  PropTypes.string,
  PropTypes.number,
]);

ApproverSelect.propTypes = {
  name: PropTypes.string.isRequired,
  labelProperty: PropTypes.string,
  valueProperty: PropTypes.string,
  filterInitialValue: PropTypes.bool,
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
  required: PropTypes.bool,
};

ApproverSelect.defaultProps = {
  labelProperty: 'label',
  valueProperty: 'value',
  filterInitialValue: false,
  required: true,
};

export default ApproverSelect;
