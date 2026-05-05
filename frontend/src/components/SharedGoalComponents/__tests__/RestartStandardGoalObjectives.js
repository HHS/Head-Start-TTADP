/* eslint-disable react/prop-types */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { GOAL_FORM_FIELDS } from '../../../pages/StandardGoalForm/constants';
import RestartStandardGoalObjectives from '../RestartStandardGoalObjectives';

const RTest = ({ children, defaultValues = {} }) => {
  const methods = useForm({ defaultValues });

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...methods}>{children}</FormProvider>
  );
};

const renderWithFormProvider = (ui, formData = {}) =>
  render(<RTest defaultValues={formData}>{ui}</RTest>);

const mockOptions = [
  { id: 1, title: 'Objective 1' },
  { id: 2, title: 'Objective 2' },
  { id: 3, title: 'Objective 3' },
];

describe('RestartStandardGoalObjectives', () => {
  it('renders with add new objective button when no objectives exist', () => {
    const formData = {
      [GOAL_FORM_FIELDS.OBJECTIVES]: [],
    };

    renderWithFormProvider(
      <RestartStandardGoalObjectives
        fieldName={GOAL_FORM_FIELDS.OBJECTIVES}
        options={mockOptions}
      />,
      formData
    );

    expect(screen.getByText('Add new objective')).toBeInTheDocument();
    expect(screen.queryByText('Objectives')).not.toBeInTheDocument();
  });

  it('renders objectives heading when objectives exist', async () => {
    const formData = {
      [GOAL_FORM_FIELDS.OBJECTIVES]: [
        { value: 'Test Objective', objectiveId: 1, label: 'Objective 1' },
      ],
    };

    renderWithFormProvider(
      <RestartStandardGoalObjectives
        fieldName={GOAL_FORM_FIELDS.OBJECTIVES}
        options={mockOptions}
      />,
      formData
    );

    expect(await screen.findByRole('heading', { name: 'Objectives' })).toBeInTheDocument();
  });

  it('shows alert when objectives are reported (onAR)', () => {
    const formData = {
      [GOAL_FORM_FIELDS.OBJECTIVES]: [
        {
          value: 'Test Objective',
          objectiveId: 1,
          label: 'Objective 1',
          onAR: true,
        },
      ],
    };

    renderWithFormProvider(
      <RestartStandardGoalObjectives
        fieldName={GOAL_FORM_FIELDS.OBJECTIVES}
        options={mockOptions}
      />,
      formData
    );

    expect(screen.getByText('Objectives used on reports cannot be edited.')).toBeInTheDocument();
  });

  it('does not show alert when no objectives are reported', () => {
    const formData = {
      [GOAL_FORM_FIELDS.OBJECTIVES]: [
        {
          value: 'Test Objective',
          objectiveId: 1,
          label: 'Objective 1',
          onAR: false,
        },
      ],
    };

    renderWithFormProvider(
      <RestartStandardGoalObjectives
        fieldName={GOAL_FORM_FIELDS.OBJECTIVES}
        options={mockOptions}
      />,
      formData
    );

    expect(
      screen.queryByText('Objectives used on reports cannot be edited.')
    ).not.toBeInTheDocument();
  });

  it('adds new objective when plus button is clicked', () => {
    const formData = {
      [GOAL_FORM_FIELDS.OBJECTIVES]: [],
    };

    renderWithFormProvider(
      <RestartStandardGoalObjectives
        fieldName={GOAL_FORM_FIELDS.OBJECTIVES}
        options={mockOptions}
      />,
      formData
    );

    const addButton = screen.getByText('Add new objective');
    fireEvent.click(addButton);

    expect(screen.getByText('Select TTA objective')).toBeInTheDocument();
  });

  it('renders multiple ObjectiveSelection components', () => {
    const formData = {
      [GOAL_FORM_FIELDS.OBJECTIVES]: [
        { value: 'Objective 1', objectiveId: 1, label: 'Objective 1' },
        { value: 'Objective 2', objectiveId: 2, label: 'Objective 2' },
      ],
    };

    renderWithFormProvider(
      <RestartStandardGoalObjectives
        fieldName={GOAL_FORM_FIELDS.OBJECTIVES}
        options={mockOptions}
      />,
      formData
    );

    const removeButtons = screen.getAllByText('Remove this objective');
    expect(removeButtons).toHaveLength(2);
  });
});
