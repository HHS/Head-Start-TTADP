import { uniqBy } from 'lodash';

export const MULTISELECT_VALIDATION_DICTIONARY = {
  maxSelections: (validation) => (selectedOptions) => (
    selectedOptions.length <= validation.value
  ) || validation.message,
  minSelections: (validation) => (selectedOptions) => (
    selectedOptions.length >= validation.value
  ) || validation.message,
};

export const MULTISELECT_RESPONSE_COMPLETION_DICTIONARY = {
  maxSelections: (validation, selectedOptions) => (
    selectedOptions.length <= validation.value
  ),
  minSelections: (validation, selectedOptions) => (
    selectedOptions.length >= validation.value
  ),
};

const MULTISELECT_VALIDATION_DICTIONARY_KEYS = Object.keys(MULTISELECT_VALIDATION_DICTIONARY);
// eslint-disable-next-line max-len
const MULTISELECT_RESPONSE_COMPLETION_DICTIONARY_KEYS = Object.keys(MULTISELECT_RESPONSE_COMPLETION_DICTIONARY);

const confirmMultiselectResponseComplete = (validations) => validations.rules.reduce((
  acc, validation,
) => {
  const isValidKey = MULTISELECT_RESPONSE_COMPLETION_DICTIONARY_KEYS.includes(validation.name);
  if (!isValidKey) {
    return acc;
  }

  return [
    ...acc,
    (selectedOptions) => (
      MULTISELECT_RESPONSE_COMPLETION_DICTIONARY[validation.name](validation, selectedOptions)
    ),
  ];
}, []);

const transformMultiselectValidationsIntoRules = (validations) => validations.rules.reduce((
  acc, validation,
) => {
  const isValidKey = MULTISELECT_VALIDATION_DICTIONARY_KEYS.includes(validation.name);

  if (!isValidKey) {
    return acc;
  }

  return {
    ...acc,
    validate: {
      ...acc.validate,
      [validation.name]: (value) => (
        MULTISELECT_VALIDATION_DICTIONARY[validation.name](validation)(value)
      ),
    },
  };
}, {
  validate: validations.required ? {
    mustSelectOne: (value) => value.length > 0 || 'Please select at least one option',
  } : {},
});

/**
 * this function will store the initial values of the prompts
 * so that we can know if the prompt was initially complete or not
 */
const updateRefToInitialValues = (initialValues, prompts) => {
  const promptValues = (prompts || []).map((p) => ({
    promptId: p.promptId,
    response: p.response,
  }));

  const alreadySaved = initialValues.map((p) => p.promptId);

  // get all promptValues not in alreadySaved
  const newPrompts = promptValues.filter((p) => !alreadySaved.includes(p.promptId));
  return [...initialValues, ...newPrompts];
};

export const combinePrompts = (templatePrompts, goalPrompts) => uniqBy([
  ...(templatePrompts || []),
  ...(goalPrompts || []).map((prompt) => ({
    title: prompt.title,
    prompt: prompt.prompt,
    options: prompt.options,
    fieldType: prompt.fieldType,
    validations: prompt.validations,
    promptId: prompt.promptId,
    response: prompt.response,
    caution: prompt.caution,
    hint: prompt.hint,
  })),
], 'title');

export default {
  updateRefToInitialValues,
  multiselect: {
    VALIDATION_DICTIONARY: MULTISELECT_VALIDATION_DICTIONARY,
    RESPONSE_COMPLETION_DICTIONARY: MULTISELECT_RESPONSE_COMPLETION_DICTIONARY,
    VALIDATION_DICTIONARY_KEYS: MULTISELECT_VALIDATION_DICTIONARY_KEYS,
    RESPONSE_COMPLETION_DICTIONARY_KEYS: MULTISELECT_RESPONSE_COMPLETION_DICTIONARY_KEYS,
    confirmResponseComplete: confirmMultiselectResponseComplete,
    transformValidationsIntoRules: transformMultiselectValidationsIntoRules,
  },
};
