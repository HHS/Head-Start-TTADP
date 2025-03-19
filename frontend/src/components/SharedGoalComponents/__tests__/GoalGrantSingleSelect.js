/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
/* eslint-disable arrow-body-style */
/* eslint-disable max-len */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import GoalGrantSingleSelect from '../GoalGrantSingleSelect';

const mockPermissions = [true];
const mockSelectedGrant = { numberWithProgramTypes: 'Grant 1', id: 1 };
const mockPossibleGrants = [
  { numberWithProgramTypes: 'Grant 1', id: 1 },
  { numberWithProgramTypes: 'Grant 2', id: 2 },
];

const RenderTest = () => {
  const hookForm = useForm();

  return (
    <FormProvider {...hookForm}>
      <GoalGrantSingleSelect
        permissions={mockPermissions}
        control={hookForm.control}
        selectedGrant={mockSelectedGrant}
        possibleGrants={mockPossibleGrants}
      />
    </FormProvider>
  );
};

const renderComponent = () => {
  return render(<RenderTest />);
};

describe('GoalGrantSingleSelect', () => {
  test('renders without crashing', () => {
    renderComponent();
    expect(screen.getByLabelText(/Recipient grant numbers/i)).toBeInTheDocument();
  });
});
