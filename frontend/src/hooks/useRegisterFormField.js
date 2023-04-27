import { useController } from 'react-hook-form/dist/index.ie11';

export default function useRegisterFormField(
  fieldName, rules, defaultValue,
) {
  const {
    field: {
      onChange,
      onBlur,
      value: fieldValue,
      name,
    },
  } = useController({
    name: fieldName,
    rules,
    defaultValue,
  });

  return {
    onChange,
    onBlur,
    fieldValue,
    name,
  };
}
