/* eslint-disable react/prop-types */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import ObjectivesSection from '../ObjectivesSection';
import { GOAL_FORM_FIELDS } from '../../../pages/StandardGoalForm/constants';
import { OBJECTIVE_STATUS } from '../../../Constants';

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
      [GOAL_FORM_FIELDS.OBJECTIVES]: [{
        objectiveId: '1', value: 'Objective 1', onAR: false, status: OBJECTIVE_STATUS.IN_PROGRESS,
      }],
    });
    const objectives = await screen.findAllByLabelText(/tta objective/i);
    expect(objectives).toHaveLength(2);
    expect(screen.getAllByText('Remove this objective')).toHaveLength(2);
    expect(screen.queryAllByText(/tta objective/i).length).toBe(2);
  });

  it('renders ReadOnlyField when onAR is true', async () => {
    renderWithFormProvider(<ObjectivesSection fieldName={GOAL_FORM_FIELDS.OBJECTIVES} />);
    reset({
      [GOAL_FORM_FIELDS.OBJECTIVES]: [{ objectiveId: '1', value: 'Objective 1', onAR: true }],
    });
    expect(await screen.findByText('Objective 1', { selector: 'div' })).toBeInTheDocument();
  });

  it('rendes ReadOnlyField when status is Complete or Suspended', async () => {
    renderWithFormProvider(<ObjectivesSection fieldName={GOAL_FORM_FIELDS.OBJECTIVES} />);
    reset({
      [GOAL_FORM_FIELDS.OBJECTIVES]: [
        { objectiveId: '1', value: 'Objective 1', status: OBJECTIVE_STATUS.COMPLETE },
        { objectiveId: '2', value: 'Objective 2', status: OBJECTIVE_STATUS.SUSPENDED },
      ],
    });

    expect(await screen.findByText('Objective 1', { selector: 'div' })).toBeInTheDocument();
    expect(await screen.findByText('Objective 2', { selector: 'div' })).toBeInTheDocument();
  });

  it('doesnt render ReadOnlyField when status is not Complete or Suspended', async () => {
    renderWithFormProvider(<ObjectivesSection fieldName={GOAL_FORM_FIELDS.OBJECTIVES} />);
    reset({
      [GOAL_FORM_FIELDS.OBJECTIVES]: [{ objectiveId: '1', value: 'Objective 1', status: OBJECTIVE_STATUS.IN_PROGRESS }],
    });

    expect(await screen.findByText('Objective 1', { selector: 'textarea' })).toBeInTheDocument();
  });

  it('shows the readonly and remove button when onAR is false', async () => {
    renderWithFormProvider(<ObjectivesSection fieldName={GOAL_FORM_FIELDS.OBJECTIVES} />);
    reset({
      [GOAL_FORM_FIELDS.OBJECTIVES]: [{
        objectiveId: '1', value: 'Objective 1', onAR: false, statue: OBJECTIVE_STATUS.SUSPENDED,
      }],
    });

    expect(await screen.findByText('Objective 1', { selector: 'textarea' })).toBeInTheDocument();
    // We hide the edite via css.
    expect(screen.getAllByText('Remove this objective')).toHaveLength(2);
  });

  it('renders the alert when objectives are onAR', () => {
    renderWithFormProvider(<ObjectivesSection fieldName={GOAL_FORM_FIELDS.OBJECTIVES} />);
    reset({
      [GOAL_FORM_FIELDS.OBJECTIVES]: [{ objectiveId: '1', value: 'Objective 1', onAR: true }],
    });

    expect(screen.getByText('Objectives used on reports cannot be edited.')).toBeInTheDocument();
  });

  it('does not render the alert when no objectives are onAR', () => {
    renderWithFormProvider(<ObjectivesSection fieldName={GOAL_FORM_FIELDS.OBJECTIVES} />);
    reset({
      [GOAL_FORM_FIELDS.OBJECTIVES]: [{ objectiveId: '1', value: 'Objective 1', onAR: false }],
    });

    expect(screen.queryByText('Objectives used on reports cannot be edited.')).not.toBeInTheDocument();
  });
});
