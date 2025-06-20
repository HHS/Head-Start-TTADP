/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable max-len */
/* eslint-disable react/prop-types */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import selectEvent from 'react-select-event';
import GoalFormTemplatePrompts, { validate } from '../GoalFormTemplatePrompts';
import { GOAL_FORM_FIELDS } from '../../../pages/StandardGoalForm/constants';

let methods;

const Wrapper = ({ children }) => {
  methods = useForm({
    mode: 'onSubmit',
  });
  return (
    <FormProvider {...methods}>
      {children}
      <button type="submit">Submit</button>
    </FormProvider>
  );
};

describe('GoalFormTemplatePrompts', () => {
  describe('validate', () => {
    it('returns true when there is at least one option selected', () => {
      expect(validate(['Option 1'])).toBe(true);
    });

    it('returns an error message when no options are selected', () => {
      expect(validate([])).toBe('Select at least one root cause');
    });

    it('returns an error message when more than two options are selected', () => {
      expect(validate(['Option 1', 'Option 2', 'Option 3'])).toBe('Select a maximum of 2 root causes');
    });
  });

  const goalTemplatePrompts = [
    {
      prompt: 'Select fei root cause',
      hint: 'Choose the root causes for the goal',
      options: ['Option 1', 'Option 2', 'Option 3'],
    },
  ];

  it('renders without crashing', () => {
    render(
      <Wrapper>
        <GoalFormTemplatePrompts goalTemplatePrompts={goalTemplatePrompts} fieldName={GOAL_FORM_FIELDS.ROOT_CAUSES} />
      </Wrapper>,
    );
    expect(screen.getByLabelText(/select fei root cause/i)).toBeInTheDocument();
  });

  it('renders the correct prompt and hint', () => {
    render(
      <Wrapper>
        <GoalFormTemplatePrompts goalTemplatePrompts={goalTemplatePrompts} fieldName={GOAL_FORM_FIELDS.ROOT_CAUSES} />
      </Wrapper>,
    );
    expect(screen.getByText(/Select fei root causes/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose the root causes for the goal/i)).toBeInTheDocument();
  });

  it('can select options', async () => {
    render(
      <Wrapper>
        <GoalFormTemplatePrompts goalTemplatePrompts={goalTemplatePrompts} fieldName={GOAL_FORM_FIELDS.ROOT_CAUSES} />
      </Wrapper>,
    );

    const select = screen.getByLabelText(/select fei root causes/i);

    await selectEvent.select(select, ['Option 1', 'Option 2']);

    expect(methods.getValues(GOAL_FORM_FIELDS.ROOT_CAUSES)).toEqual([
      {
        id: 'Option 1',
        name: 'Option 1',
      },
      {
        id: 'Option 2',
        name: 'Option 2',
      },
    ]);
  });

  it('returns null if no goalTemplatePrompts are provided', async () => {
    const { container } = render(
      <Wrapper>
        <GoalFormTemplatePrompts goalTemplatePrompts={null} fieldName={GOAL_FORM_FIELDS.ROOT_CAUSES} />
      </Wrapper>,
    );
    const submitButton = await screen.findByRole('button', { name: /submit/i });
    expect(container.firstChild).toBe(submitButton);
  });
});
