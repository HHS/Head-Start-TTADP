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

export const confirmMultiselectResponseComplete = (validations) => validations.rules.reduce((
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
    mustSelectOne: (value) => (value && value.length > 0) || 'Please select at least one option',
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

/*
* This function combines the following:
* Note: Both goalResponses and templateResponses contain the prompts with responses.
* 1. goalResponses: Prompts with responses from the activity report goal field responses table.
* 2. templateResponses: Prompts with responses from the goal field responses table.
* 3. templatePrompts: These are all the required prompts from the goal template field prompts table.
* We pass in 'activityRecipients' because we need to ensure that every
* grant on the report has a prompt to get a response on the goal form.
*/
export const
  combinePrompts = (
    goalResponses,
    templateResponses,
    /*
     Because we use the use the 'useGoalTemplatePrompts',
     we should always get back all the prompts.
    */
    templatePrompts,
    activityRecipients,
  ) => {
    // Get a distinct list of prompts per grant.
    const promptsPerGrant = uniqBy([
      ...(templateResponses || []),
      ...(goalResponses || []).map((prompt) => ({
        title: prompt.title,
        prompt: prompt.prompt,
        options: prompt.options,
        fieldType: prompt.fieldType,
        validations: prompt.validations,
        promptId: prompt.promptId,
        response: prompt.response,
        caution: prompt.caution,
        hint: prompt.hint,
        displayName: prompt.grantDisplayName,
        grantId: prompt.grantId,
      })),
    ], (item) => `${item.grantId || ''}__${item.title}`);

    // Loop all templatePrompts and add prompts for any grants that don't have prompts yet.
    const result = [];
    (templatePrompts || []).forEach((prompt) => {
    // Loop all activityRecipient and ensure we have a prompt for every
    // activityRecipient.activityRecipientId (grantId).
    // If we don't have a prompt for the activityRecipient (grant), we add it.
      activityRecipients.forEach((activityRecipient) => {
        const existingPrompt = promptsPerGrant.find(
          (p) => p.grantId === activityRecipient.activityRecipientId
        && p.promptId === prompt.promptId,
        );
        if (existingPrompt) {
          if (!existingPrompt.displayName) {
            existingPrompt.displayName = activityRecipient.name;
          }
          // Just add existing to the list.
          result.push(existingPrompt);
        } else {
        // We don't have this prompt for this grantId, so we add it.
          result.push({
            title: prompt.title,
            prompt: prompt.prompt,
            options: prompt.options,
            fieldType: prompt.fieldType,
            validations: prompt.validations,
            promptId: prompt.promptId,
            response: null,
            caution: prompt.caution,
            hint: prompt.hint,
            grantId: activityRecipient.activityRecipientId,
            displayName: activityRecipient.name,
          });
        }
      });
    });
    return result;
  };

export const combineRtrPrompts = (templatePrompts, goalPrompts) => uniqBy([
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
