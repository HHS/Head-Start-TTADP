/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import NextStepsRepeater from '../NextStepsRepeater';

const TestWrapper = ({ values }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: values || { steps: [{ collabStepDetail: 'Detail 1', collabStepCompleteDate: '10/04/2025' }] },
  });

  return (
    <FormProvider {...hookForm}>
      <NextStepsRepeater
        name="steps"
        ariaName="Next Steps"
      />
    </FormProvider>
  );
};

describe('NextStepsRepeater', () => {
  it('renders without crashing', () => {
    render(<TestWrapper />);
    expect(screen.getByText('Add next step')).toBeInTheDocument();
  });

  it('renders a step if one provided', () => {
    render(<TestWrapper />);
    expect(screen.getByDisplayValue('Detail 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10/04/2025')).toBeInTheDocument();
  });

  it('adds steps', () => {
    render(<TestWrapper />);
    screen.getByText('Add next step').click();
    expect(screen.getAllByLabelText('Step 2 *')).toHaveLength(1);
  });

  it('prevents adding steps if detail not present', async () => {
    const values = { steps: [{ collabStepDetail: '', collabStepCompleteDate: '10/04/2025' }] };
    render(<TestWrapper values={values} />);
    const initialSteps = await screen.findAllByLabelText('Step ', { exact: false });
    expect(initialSteps).toHaveLength(1);

    screen.getByText('Add next step').click();
    expect(screen.getAllByText('Enter a next step')).toHaveLength(1);

    const finalSteps = await screen.findAllByLabelText('Step ', { exact: false });
    expect(finalSteps).toHaveLength(1);
  });

  it('removes steps', async () => {
    render(<TestWrapper />);
    screen.getByText('Add next step').click();
    const initialSteps = await screen.findAllByLabelText('Step ', { exact: false });
    expect(initialSteps).toHaveLength(2);

    screen.getAllByText('remove step', { exact: false })[1].click();
    const finalSteps = await screen.findAllByLabelText('Step ', { exact: false });
    expect(finalSteps).toHaveLength(1);
  });
});
