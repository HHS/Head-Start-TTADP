/* eslint-disable react/prop-types */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import ObjectivesSection from '../ObjectivesSection';
import { GOAL_FORM_FIELDS } from '../../../pages/StandardGoalForm/constants';

let reset;

const RTest = ({ children }) => {
  const methods = useForm();

  reset = methods.reset;

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...methods}>
      {children}
    </FormProvider>
  );
};

const renderWithFormProvider = (ui) => render(
  <RTest>
    {ui}
  </RTest>,
);

describe('ObjectivesSection', () => {
  it('renders without crashing', () => {
    renderWithFormProvider(<ObjectivesSection fieldName={GOAL_FORM_FIELDS.OBJECTIVES} />);
    reset({ [GOAL_FORM_FIELDS.OBJECTIVES]: [] });
    expect(screen.getByText('Add new objective')).toBeInTheDocument();
  });

  it('renders objectives when present', () => {
    renderWithFormProvider(<ObjectivesSection fieldName={GOAL_FORM_FIELDS.OBJECTIVES} />);
    reset({
      [GOAL_FORM_FIELDS.OBJECTIVES]: [{ objectiveId: '1', value: 'Objective 1', onAR: false }],
    });

    expect(screen.getByText('Objectives')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Objective 1')).toBeInTheDocument();
  });

  it('adds a new objective when "Add new objective" button is clicked', async () => {
    renderWithFormProvider(<ObjectivesSection fieldName={GOAL_FORM_FIELDS.OBJECTIVES} />);
    reset({ [GOAL_FORM_FIELDS.OBJECTIVES]: [] });
    fireEvent.click(screen.getByText('Add new objective'));

    const objectives = await screen.findAllByLabelText(/tta objective/i);
    expect(objectives).toHaveLength(2);
  });

  it('removes an objective when "Remove this objective" button is clicked', async () => {
    renderWithFormProvider(<ObjectivesSection fieldName={GOAL_FORM_FIELDS.OBJECTIVES} />);
    reset({
      [GOAL_FORM_FIELDS.OBJECTIVES]: [{ objectiveId: '1', value: 'Objective 1', onAR: false }],
    });
    const objectives = await screen.findAllByLabelText(/tta objective/i);
    expect(objectives).toHaveLength(2);
    fireEvent.click(screen.getByText('Remove this objective'));
    expect(screen.queryByLabelText(/tta objective/i)).not.toBeInTheDocument();
  });

  it('renders ReadOnlyField when onAR is true', async () => {
    renderWithFormProvider(<ObjectivesSection fieldName={GOAL_FORM_FIELDS.OBJECTIVES} />);
    reset({
      [GOAL_FORM_FIELDS.OBJECTIVES]: [{ objectiveId: '1', value: 'Objective 1', onAR: true }],
    });
    expect(await screen.findByText('Objective 1', { selector: 'div' })).toBeInTheDocument();
  });
});
