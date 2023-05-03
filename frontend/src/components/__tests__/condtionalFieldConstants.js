import condtionalFieldConstants, { combinePrompts } from '../condtionalFieldConstants';

describe('condtionalFieldConstants', () => {
  describe('combinePrompts', () => {
    it('combines prompts', () => {
      const combinedPrompts = combinePrompts(
        [
          { promptId: 1, response: 'a', title: 'prompt 1' },
          { promptId: 2, response: 'b', title: 'prompt 2' },
        ],
        [
          { promptId: 1, response: 'c', title: 'prompt 1' },
          { promptId: 3, response: 'd', title: 'prompt 3' },
        ],
      );

      expect(combinedPrompts).toEqual([
        { promptId: 1, response: 'a', title: 'prompt 1' },
        { promptId: 2, response: 'b', title: 'prompt 2' },
        { promptId: 3, response: 'd', title: 'prompt 3' },
      ]);

      const combinedPrompts2 = combinePrompts(
        [
          { promptId: 1, response: 'a', title: 'prompt 1' },
          { promptId: 2, response: 'b', title: 'prompt 2' },
        ],
      );

      expect(combinedPrompts2).toEqual([
        { promptId: 1, response: 'a', title: 'prompt 1' },
        { promptId: 2, response: 'b', title: 'prompt 2' },
      ]);

      const combinedPrompts3 = combinePrompts(
        null,
        [
          { promptId: 1, response: 'a', title: 'prompt 1' },
          { promptId: 2, response: 'b', title: 'prompt 2' },
        ],
      );

      expect(combinedPrompts3).toEqual([
        { promptId: 1, response: 'a', title: 'prompt 1' },
        { promptId: 2, response: 'b', title: 'prompt 2' },
      ]);
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
});
