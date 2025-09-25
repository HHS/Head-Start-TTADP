import { useRef, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import _ from 'lodash';

export default function useExistingApprovers(
  options,
  fieldName = 'approvers',
  valueProperty = 'user.id',
  labelProperty = 'user.fullName',
) {
  const { watch } = useFormContext();

  const selectValue = watch(fieldName);

  const initialValueRef = useRef(selectValue);

  const filteredOptions = useMemo(() => {
    if (!initialValueRef.current) {
      return options;
    }

    const initialValues = (Array.isArray(initialValueRef.current)
      ? initialValueRef.current
      : [initialValueRef.current]).map((r) => _.get(r, valueProperty));

    return options.filter((option) => {
      const { value } = option;
      return !initialValues.includes(value);
    });
  }, [options, valueProperty]);

  const filteredValues = useMemo(() => {
    if (!selectValue) {
      return [];
    }

    let valuesToDisplay = selectValue;

    // Filter out initial values from display if filterInitialValue is true
    if (initialValueRef.current) {
      const initialValues = (Array.isArray(initialValueRef.current)
        ? initialValueRef.current
        : [initialValueRef.current]).map((r) => _.get(r, valueProperty));

      valuesToDisplay = selectValue.filter((item) => {
        const itemValue = _.get(item, valueProperty);
        return !initialValues.includes(itemValue);
      });
    }

    return valuesToDisplay.map((item) => ({
      ...item,
      label: _.get(item, labelProperty),
      value: _.get(item, valueProperty),
    }));
  }, [labelProperty, selectValue, valueProperty]);

  return {
    initialValue: initialValueRef.current,
    filteredOptions,
    filteredValues,
  };
}
