import { GoalTemplateFieldPrompt } from '..';

describe('GoalTemplateFieldPrompt Model', () => {
  it('should return true for isRequired when validations.required is true', () => {
    const instance = GoalTemplateFieldPrompt.build({ validations: { required: true } });
    expect(instance.isRequired).toBe(true);
  });

  it('should return false for isRequired when validations.required is false', () => {
    const instance = GoalTemplateFieldPrompt.build({ validations: { required: false } });
    expect(instance.isRequired).toBe(false);
  });
});
