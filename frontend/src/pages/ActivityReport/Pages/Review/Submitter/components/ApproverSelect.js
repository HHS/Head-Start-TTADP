import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { useController } from 'react-hook-form/dist/index.ie11';
import _ from 'lodash';
import useSpellCheck from '../../../../../../hooks/useSpellCheck';
import { DropdownIndicator, sortSelect, styles } from '../../../../../../components/MultiSelect';

function ApproverSelect({
  name,
  options,
  labelProperty,
  valueProperty,
}) {
  /**
   * unfortunately, given our support for ie11, we can't
   * upgrade to react-select v5, which support a spellcheck
   * attribute. Here is an awkward solution I've concocted
   * in it's stead.
  */
  useSpellCheck(name);

  const {
    field: {
      onChange: onSelect,
      value: selectValue,
      onBlur: onBlurSelect,
    },
  } = useController({
    name,
    rules: {
      validate: {
        notEmpty: (value) => (value && value.length) || 'Select at least one manager',
      },
    },
    defaultValue: null,
  });

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
      options={options}
      tabSelectsValue={false}
      isClearable={false}
      closeMenuOnSelect={false}
      hideSelectedOptions
      placeholder=""
      isMulti
      required
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
  //   control: PropTypes.object.isRequired,
  components: PropTypes.shape({}),
  rules: PropTypes.shape({}),
};

ApproverSelect.defaultProps = {
  labelProperty: 'label',
  valueProperty: 'value',
  components: {},
  rules: {},
};

export default ApproverSelect;
