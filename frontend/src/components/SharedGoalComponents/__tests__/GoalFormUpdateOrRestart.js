/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { FormProvider, useForm } from 'react-hook-form';
import { MemoryRouter } from 'react-router';
import GoalFormUpdateOrRestart from '../GoalFormUpdateOrRestart';

const mockRecipient = {
  id: 1,
  name: 'Recipient Name',
  grants: [
    {
      id: 1,
      numberWithProgramTypes: 'Grant 1',
    },
  ],
};

const mockGoal = {
  id: 1,
  name: 'Goal Name',
  grant: {
    numberWithProgramTypes: 'Grant 1',
  },
};

const mockButtons = [
  {
    id: 'button-1',
    type: 'submit',
    variant: 'primary',
    label: 'Submit',
    to: '#',
  },
];

const mockGoalTemplatePrompts = [
  {
    id: 1,
    prompt: 'Prompt',
    options: [
      {
        id: 1,
        option: 'Option 1',
      },
    ],
  },
];

const mockOnSubmit = jest.fn();

describe('GoalFormUpdateOrRestart', () => {
  const RenderTest = ({ goalTemplatePrompts = null, isRestart = false }) => {
    const hookForm = useForm();
    return (
      <MemoryRouter>
        <FormProvider {...hookForm}>
          <GoalFormUpdateOrRestart
            hookForm={hookForm}
            recipient={mockRecipient}
            regionId="1"
            goal={mockGoal}
            standardGoalFormButtons={mockButtons}
            onSubmit={mockOnSubmit}
            goalTemplatePrompts={goalTemplatePrompts}
            isRestart={isRestart}
          />
        </FormProvider>
      </MemoryRouter>
    );
  };
  it('renders correctly with required props', () => {
    render(<RenderTest />);
    expect(screen.getByText('Recipient grant numbers')).toBeInTheDocument();
    expect(screen.getByText('Recipient\'s goal')).toBeInTheDocument();
    expect(screen.getByText('Goal Name')).toBeInTheDocument();
    expect(screen.getByText('Grant 1')).toBeInTheDocument();
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('renders goal template prompts when provided', () => {
    render(<RenderTest goalTemplatePrompts={mockGoalTemplatePrompts} />);
    expect(screen.getByLabelText(/Prompts/i)).toBeInTheDocument();
  });

  it('renders ObjectivesSection when isRestart is false', () => {
    render(<RenderTest isRestart={false} />);
    expect(screen.getByTestId('objectives-section')).toBeInTheDocument();
  });

  it('renders RestartStandardGoalObjectives when isRestart is true', () => {
    render(<RenderTest isRestart />);
    expect(screen.getByTestId('restart-standard-goal-objectives')).toBeInTheDocument();
  });
});
