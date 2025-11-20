/* eslint-disable react/prop-types */
import React from 'react';
import {
  render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import ObjectiveSelection from '../ObjectiveSelection';
import { GOAL_FORM_FIELDS } from '../../../pages/StandardGoalForm/constants';
import { CREATE_A_NEW_OBJECTIVE } from '../constants';

const RTest = ({ children, defaultValues = {} }) => {
  const methods = useForm({ defaultValues });

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...methods}>
      {children}
    </FormProvider>
  );
};

const renderWithFormProvider = (ui, formData = {}) => render(
  <RTest defaultValues={formData}>
    {ui}
  </RTest>,
);

const mockField = {
  id: '1',
  objectiveId: 1,
  label: 'Objective 1',
  value: 'Test objective value',
};

const mockObjectiveOptions = [
  { value: 'objective-1', label: 'Objective 1', objectiveId: 1 },
  { value: 'objective-2', label: 'Objective 2', objectiveId: 2 },
  { value: 'objective-3', label: 'Objective 3', objectiveId: 3 },
  { value: CREATE_A_NEW_OBJECTIVE, label: CREATE_A_NEW_OBJECTIVE, objectiveId: null },
];

const mockRemove = jest.fn();

describe('ObjectiveSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders objective selection with no existing objectives', () => {
    const formData = {
      [GOAL_FORM_FIELDS.OBJECTIVES]: [{ label: '', value: '', objectiveId: null }],
    };

    renderWithFormProvider(
      <ObjectiveSelection
        field={mockField}
        index={0}
        remove={mockRemove}
        fieldName={GOAL_FORM_FIELDS.OBJECTIVES}
        objectiveOptions={mockObjectiveOptions}
      />,
      formData,
    );

    expect(screen.getByText('Select TTA objective')).toBeInTheDocument();
    expect(screen.getByText('Remove this objective')).toBeInTheDocument();
  });

  it('filters out already selected objectives', () => {
    const formData = {
      [GOAL_FORM_FIELDS.OBJECTIVES]: [
        { label: 'Objective 1', value: 'objective-1', objectiveId: 1 },
        { label: 'Objective 2', value: 'objective-2', objectiveId: 2 },
        { label: '', value: '', objectiveId: null },
      ],
    };

    renderWithFormProvider(
      <ObjectiveSelection
        field={{ ...mockField, label: '', value: '' }}
        index={2}
        remove={mockRemove}
        fieldName={GOAL_FORM_FIELDS.OBJECTIVES}
        objectiveOptions={mockObjectiveOptions}
      />,
      formData,
    );

    expect(screen.getByText('Select TTA objective')).toBeInTheDocument();
  });

  it('allows current field selection even if already selected', () => {
    const formData = {
      [GOAL_FORM_FIELDS.OBJECTIVES]: [
        { label: 'Objective 1', value: 'Objective 1', objectiveId: 1 },
      ],
    };

    const fieldWithMatchingData = {
      ...mockField,
      label: 'Objective 1',
      value: 'Objective 1',
    };

    renderWithFormProvider(
      <ObjectiveSelection
        field={fieldWithMatchingData}
        index={0}
        remove={mockRemove}
        fieldName={GOAL_FORM_FIELDS.OBJECTIVES}
        objectiveOptions={mockObjectiveOptions}
      />,
      formData,
    );

    expect(screen.getByText('Select TTA objective')).toBeInTheDocument();
  });

  it('calls remove function when remove button is clicked', () => {
    const formData = {
      [GOAL_FORM_FIELDS.OBJECTIVES]: [{ label: 'Objective 1', value: 'Objective 1', objectiveId: 1 }],
    };

    const fieldWithMatchingData = {
      ...mockField,
      label: 'Objective 1',
      value: 'Objective 1',
    };

    renderWithFormProvider(
      <ObjectiveSelection
        field={fieldWithMatchingData}
        index={0}
        remove={mockRemove}
        fieldName={GOAL_FORM_FIELDS.OBJECTIVES}
        objectiveOptions={mockObjectiveOptions}
      />,
      formData,
    );

    const removeButton = screen.getByText('Remove this objective');
    fireEvent.click(removeButton);

    expect(mockRemove).toHaveBeenCalledWith(0);
  });

  it('renders textarea when "Create a new objective" is selected', () => {
    const fieldWithCreateNew = {
      ...mockField,
      label: CREATE_A_NEW_OBJECTIVE,
    };

    const formData = {
      [GOAL_FORM_FIELDS.OBJECTIVES]: [
        { label: CREATE_A_NEW_OBJECTIVE, value: '', objectiveId: null },
      ],
    };

    renderWithFormProvider(
      <ObjectiveSelection
        field={fieldWithCreateNew}
        index={0}
        remove={mockRemove}
        fieldName={GOAL_FORM_FIELDS.OBJECTIVES}
        objectiveOptions={mockObjectiveOptions}
      />,
      formData,
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders only textarea when only "Create a new objective" option is available', async () => {
    const formData = {
      [GOAL_FORM_FIELDS.OBJECTIVES]: [
        { label: CREATE_A_NEW_OBJECTIVE, value: '', objectiveId: null },
      ],
    };

    renderWithFormProvider(
      <ObjectiveSelection
        field={{ value: '', objectiveId: null }}
        index={0}
        remove={mockRemove}
        fieldName={GOAL_FORM_FIELDS.OBJECTIVES}
        objectiveOptions={[{
          value: CREATE_A_NEW_OBJECTIVE,
          label: CREATE_A_NEW_OBJECTIVE,
          objectiveId: null,
        }]}
      />,
      formData,
    );

    expect(await screen.findByText('TTA objective')).toBeInTheDocument();
    expect(await screen.findByRole('textbox')).toBeInTheDocument();

    // Wait for the component to process form state and apply conditional styling
    await waitFor(() => {
      const formGroup = screen.getByTestId('formGroup');
      const label = formGroup.querySelector('label');
      expect(label).toHaveClass('display-none');
    });
  });
});
