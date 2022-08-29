/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import {
  render, screen,
} from '@testing-library/react';
import ObjectiveTitle from '../ObjectiveTitle';

const RenderObjectiveTitle = ({
  goalId = 12,
  collaborators = [],
}) => {
  let goalForEditing = null;

  if (goalId) {
    goalForEditing = {
      id: goalId,
      objectives: [],
    };
  }

  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues: {
      collaborators,
      author: {
        role: 'Central office',
      },
      goalForEditing,
    },
  });

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <ObjectiveTitle
        error={<></>}
        isOnApprovedReport
        isOnReport
        title="Objective title"
        validateObjectiveTitle={jest.fn()}
        onChangeTitle={jest.fn()}
        status="Complete"
      />
      <button type="button">blur me</button>
    </FormProvider>
  );
};

describe('ObjectiveTitle', () => {
  it('shows the read only view', async () => {
    render(<RenderObjectiveTitle />);
    expect(await screen.findByText('Objective title')).toBeVisible();
  });
});
