/*
  This multiselect component uses react-select. React select expects options and selected
  values to be in a specific format, arrays of `{ label: x, value: y }` items. Sometimes
  we want to just push in and pull out simple arrays of strings instead of these objects.
  Dealing with arrays of strings is easier than arrays of objects. The `simple` prop being
  true makes this component look for values that are arrays of strings (other primitives may
  work, haven't tried though). In simple mode we must convert the selected array of strings to
  the object react-select expects before passing the value to react-select (Right below the
  render). When an "onChange" event happens we have to convert from the react-select object back
  to an array of strings (<Select>'s onChange). If you need this component display something other
  than the value you must use `simple=false` in order to have items show up properly in the review
  accordions.

  If simple is false this component expects the selected value to be an array of objects (say
  we want to multiselect database models, where the label will be human readable and value a
  database id). In this case the `labelProperty` and `valueProperty` props are used to convert
  the selected value to and from the react-select format.

  Options are always passed in the way react-select expects, this component passes options straight
  through to react-select. If the selected value is not in the options prop the multiselect box will
  display an empty tag.
*/
import React from 'react';
import PropTypes from 'prop-types';
import Select, { components } from 'react-select';
import { Controller } from 'react-hook-form/dist/index.ie11';

import arrowBoth from '../images/arrow-both.svg';

export const DropdownIndicator = (props) => (
  // eslint-disable-next-line react/jsx-props-no-spreading
  <components.DropdownIndicator {...props}>
    <img alt="" style={{ width: '8px' }} src={arrowBoth} />
  </components.DropdownIndicator>
);

function MultiSelect({
  name,
  options,
  disabled,
  control,
  required,
  labelProperty,
  valueProperty,
  simple,
  rules,
  multiSelectOptions,
  onItemSelected,
  singleRowInput,
  components: componentReplacements,
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
      height: singleRowInput ? '38px' : '',
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

  /*
   * @param {Array<string> || Array<object>} - value array. Either an array of strings or array
   * of objects
   * @returns {Array<{ label: string, value: string }>} - values array in format required by
   * react-select
   */
  const getValues = (value) => {
    if (simple) {
      return value.map((v) => ({
        value: v, label: v,
      }));
    }
    return value.map((item) => ({
      ...item,
      label: item[labelProperty],
      value: item[valueProperty],
    }));
  };

  /*
   * @param {*} - event. Contains values in the react-select format, an array of
   * `{ label: x, value: y }` objects
   * @param {func} - controllerOnChange. On change function from react-hook-form, to be called
   * the values in the format to be used outside of this component (not the react-select format)
   */
  const onChange = (event, controllerOnChange) => {
    if (simple) {
      controllerOnChange(event.map((v) => v.value));
    } else {
      controllerOnChange(
        event.map((item) => ({
          ...item,
          [labelProperty]: item.label,
          [valueProperty]: item.value,
        })),
      );
    }
  };

  return (
    <Controller
      render={({ onChange: controllerOnChange, value }) => {
        const values = value ? getValues(value) : value;
        return (
          <Select
            className="margin-top-1"
            id={name}
            value={values}
            onChange={(event) => {
              if (onItemSelected) {
                onItemSelected(event);
              } else if (event) {
                onChange(event, controllerOnChange);
              } else {
                controllerOnChange([]);
              }
            }}
            styles={styles}
            components={{ ...componentReplacements, DropdownIndicator }}
            options={options}
            isDisabled={disabled}
            tabSelectsValue={false}
            isClearable={multiSelectOptions.isClearable}
            closeMenuOnSelect={multiSelectOptions.closeMenuOnSelect}
            controlShouldRenderValue={multiSelectOptions.controlShouldRenderValue}
            hideSelectedOptions={multiSelectOptions.hideSelectedOptions}
            placeholder=""
            isMulti
          />
        );
      }}
      control={control}
      rules={{
        validate: (value) => {
          if (required && (!value || value.length === 0)) {
            return required;
          }
          return true;
        },
        ...rules,
      }}
      name={name}
    />
  );
}

const value = PropTypes.oneOfType([
  PropTypes.string,
  PropTypes.number,
]);

MultiSelect.propTypes = {
  name: PropTypes.string.isRequired,
  labelProperty: PropTypes.string,
  valueProperty: PropTypes.string,
  simple: PropTypes.bool,
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
  // eslint-disable-next-line react/forbid-prop-types
  control: PropTypes.object.isRequired,
  components: PropTypes.shape({}),
  onItemSelected: PropTypes.func,
  singleRowInput: PropTypes.bool,
  multiSelectOptions: PropTypes.shape({
    isClearable: PropTypes.bool,
    closeMenuOnSelect: PropTypes.bool,
    controlShouldRenderValue: PropTypes.bool,
    hideSelectedOptions: PropTypes.bool,
  }),
  disabled: PropTypes.bool,
  rules: PropTypes.shape({}),
  required: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
};

MultiSelect.defaultProps = {
  disabled: false,
  singleRowInput: false,
  required: 'Please select at least one item',
  simple: true,
  labelProperty: 'label',
  valueProperty: 'value',
  multiSelectOptions: {},
  components: {},
  rules: {},
  onItemSelected: null,
};

export default MultiSelect;
