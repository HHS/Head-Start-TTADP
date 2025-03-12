/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable max-len */
/* eslint-disable react/prop-types */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import GoalFormTemplatePrompts from '../GoalFormTemplatePrompts';
import { GOAL_FORM_FIELDS } from '../../../pages/StandardGoalForm/constants';

const Wrapper = ({ children }) => {
  const methods = useForm();
  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('GoalFormTemplatePrompts', () => {
  const goalTemplatePrompts = [
    {
      prompt: 'Select root causes',
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
    expect(screen.getByLabelText(/select root causes/i)).toBeInTheDocument();
  });

  it('renders the correct prompt and hint', () => {
    render(
      <Wrapper>
        <GoalFormTemplatePrompts goalTemplatePrompts={goalTemplatePrompts} fieldName={GOAL_FORM_FIELDS.ROOT_CAUSES} />
      </Wrapper>,
    );
    expect(screen.getByText('Select root causes')).toBeInTheDocument();
    expect(screen.getByText('Choose the root causes for the goal')).toBeInTheDocument();
  });

  it('returns null if no goalTemplatePrompts are provided', () => {
    const { container } = render(
      <Wrapper>
        <GoalFormTemplatePrompts goalTemplatePrompts={null} fieldName={GOAL_FORM_FIELDS.ROOT_CAUSES} />
      </Wrapper>,
    );
    expect(container.firstChild).toBeNull();
  });
});
