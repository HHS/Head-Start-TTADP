import condtionalFieldConstants, {
  combinePrompts,
  MULTISELECT_RESPONSE_COMPLETION_DICTIONARY,
  MULTISELECT_VALIDATION_DICTIONARY,
  confirmMultiselectResponseComplete,
} from '../condtionalFieldConstants';

describe('condtionalFieldConstants', () => {
  describe('combinePrompts', () => {
    it('combines prompts', () => {
      const combinedPrompts = combinePrompts(
        // ARG responses.
        [
          {
            promptId: 1, response: 'c', title: 'prompt 1', grantId: 1, grantDisplayName: 'Sample Grant 1',
          },
        ],
        // Goal responses.
        [
          {
            promptId: 1, response: 'a', title: 'prompt 1', grantId: 1,
          },
          {
            promptId: 2, response: 'b', title: 'prompt 2', grantId: 1,
          },
          {
            promptId: 4, response: 'e', title: 'prompt 4', grantId: 1,
          },
        ],
        // Template prompts.
        [
          {
            promptId: 1, response: null, title: 'prompt 1',
          },
          {
            promptId: 2, response: null, title: 'prompt 2',
          },
          {
            promptId: 3, response: null, title: 'prompt 3',
          },
          {
            promptId: 4, response: null, title: 'prompt 4',
          },
        ],
        // Activity recipients.
        [
          {
            activityRecipientId: 1, name: 'Sample Grant 1',
          },
        ],
      );

      expect(combinedPrompts.length).toEqual(4);
      const prompt1 = combinedPrompts.find((p) => p.title === 'prompt 1');
      // Expect combinedPrompts to contain the correct values.
      expect(prompt1).toEqual({
        promptId: 1,
        response: 'a',
        title: 'prompt 1',
        grantId: 1,
        displayName: 'Sample Grant 1',
      });
      const prompt2 = combinedPrompts.find((p) => p.title === 'prompt 2');
      expect(prompt2).toEqual({
        promptId: 2,
        response: 'b',
        title: 'prompt 2',
        grantId: 1,
        displayName: 'Sample Grant 1',
      });
      const prompt3 = combinedPrompts.find((p) => p.title === 'prompt 3');
      expect(prompt3.promptId).toEqual(3);
      expect(prompt3.response).toEqual(null);
      expect(prompt3.title).toEqual('prompt 3');
      expect(prompt3.grantId).toEqual(1);
      expect(prompt3.displayName).toEqual('Sample Grant 1');

      const prompt4 = combinedPrompts.find((p) => p.title === 'prompt 4');
      expect(prompt4).toEqual({
        promptId: 4,
        response: 'e',
        title: 'prompt 4',
        grantId: 1,
        displayName: 'Sample Grant 1',
      });
    });

    it('just returns a combo of the two if no template prompts', () => {
      const combinedPrompts = combinePrompts(
        // ARG responses.
        [
          {
            promptId: 1, response: 'c', title: 'prompt 1', grantId: 1, grantDisplayName: 'Sample Grant 1',
          },
        ],
        // Goal responses.
        [
          {
            promptId: 1, response: 'a', title: 'prompt 1', grantId: 1,
          },
          {
            promptId: 2, response: 'b', title: 'prompt 2', grantId: 1,
          },
          {
            promptId: 4, response: 'e', title: 'prompt 4', grantId: 1,
          },
        ],
        // Template prompts.
        [
          {
            promptId: 1, response: null, title: 'prompt 1',
          },
          {
            promptId: 2, response: null, title: 'prompt 2',
          },
          {
            promptId: 3, response: null, title: 'prompt 3',
          },
          {
            promptId: 4, response: null, title: 'prompt 4',
          },
        ],
        // Activity recipients.
        [
          {
            activityRecipientId: 1, name: 'Sample Grant 1',
          },
        ],
      );

      expect(combinedPrompts.length).toEqual(4);
      const prompt1 = combinedPrompts.find((p) => p.title === 'prompt 1');
      // Expect combinedPrompts to contain the correct values.
      expect(prompt1).toEqual({
        promptId: 1,
        response: 'a',
        title: 'prompt 1',
        grantId: 1,
        displayName: 'Sample Grant 1',
      });
      const prompt2 = combinedPrompts.find((p) => p.title === 'prompt 2');
      expect(prompt2).toEqual({
        promptId: 2,
        response: 'b',
        title: 'prompt 2',
        grantId: 1,
        displayName: 'Sample Grant 1',
      });
      const prompt4 = combinedPrompts.find((p) => p.title === 'prompt 4');
      expect(prompt4).toEqual({
        promptId: 4,
        response: 'e',
        title: 'prompt 4',
        grantId: 1,
        displayName: 'Sample Grant 1',
      });
      const prompt3 = combinedPrompts.find((p) => p.title === 'prompt 3');
      expect(prompt3.promptId).toEqual(3);
      expect(prompt3.response).toEqual(null);
      expect(prompt3.title).toEqual('prompt 3');
      expect(prompt3.grantId).toEqual(1);
      expect(prompt3.displayName).toEqual('Sample Grant 1');
    });
  });
  describe('multiselect', () => {
    const { multiselect } = condtionalFieldConstants;

    it('transforms maxSelections', () => {
      const validations = {
        required: 'This is required',
        rules: [
          {
            name: 'maxSelections',
            value: 2,
            message: 'How DARE you',
          },
        ],
      };

      const transformedValidations = multiselect.transformValidationsIntoRules(validations);

      const validRequired = transformedValidations.validate.mustSelectOne(['a', 'b']);
      expect(validRequired).toEqual(true);

      const invalidRequired = transformedValidations.validate.mustSelectOne([]);
      expect(invalidRequired).toEqual('Please select at least one option');

      const result = transformedValidations.validate.maxSelections(['a', 'b', 'c']);
      expect(result).toEqual('How DARE you');

      const result2 = transformedValidations.validate.maxSelections(['a', 'b']);
      expect(result2).toEqual(true);
    });
  });

  describe('multiselectResponseCompletion', () => {
    it('min and max selections in MULTISELECT_RESPONSE_COMPLETION_DICTIONARY return the correct values', () => {
      const minCheck = MULTISELECT_RESPONSE_COMPLETION_DICTIONARY.minSelections({ value: 2 }, ['a', 'b']);
      expect(minCheck).toEqual(true);

      const minCheck2 = MULTISELECT_RESPONSE_COMPLETION_DICTIONARY.minSelections({ value: 2 }, ['a']);
      expect(minCheck2).toEqual(false);

      const maxCheck = MULTISELECT_RESPONSE_COMPLETION_DICTIONARY.maxSelections({ value: 1 }, ['a', 'b']);
      expect(maxCheck).toEqual(false);

      const maxCheck2 = MULTISELECT_RESPONSE_COMPLETION_DICTIONARY.maxSelections({ value: 2 }, ['a', 'b']);
      expect(maxCheck2).toEqual(true);
    });

    it('min and max selections in MULTISELECT_VALIDATION_DICTIONARY return the correct values', () => {
      const minCheck = MULTISELECT_VALIDATION_DICTIONARY.minSelections({ value: 2 })(['a', 'b']);
      expect(minCheck).toEqual(true);

      const minCheck2 = MULTISELECT_VALIDATION_DICTIONARY.minSelections({ value: 1 })(['a']);
      expect(minCheck2).toEqual(true);

      const maxCheck = MULTISELECT_VALIDATION_DICTIONARY.maxSelections({ value: 1 })(['a', 'b']);
      expect(maxCheck).toBeFalsy();

      const maxCheck2 = MULTISELECT_VALIDATION_DICTIONARY.maxSelections({ value: 2 })(['a', 'b']);
      expect(maxCheck2).toEqual(true);
    });

    it('correctly reduces using confirmMultiselectResponseComplete', async () => {
      const validations = {
        rules: [
          {
            name: 'maxSelections',
            validation: { value: 1 },
            selectedOptions: ['a', 'b'],
          },
          {
            name: 'unknown validation',
            validation: { value: 2 },
            selectedOptions: ['a', 'b'],
          },
        ],
      };

      const result = await confirmMultiselectResponseComplete(validations);
      expect(result.length).toEqual(1);

      const maxSelections = result[0];
      // max result is a function evaluate the result of the function.
      const maxResult = maxSelections(['a', 'b']);
      expect(maxResult).toEqual(false);
    });
  });
});
