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
  ...rest
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
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...rest}
      />
      <button type="button">blur me</button>
    </FormProvider>
  );
};
const readonlyStateMap = [
  { isOnApprovedReport: true },
  { status: 'Completed' },
  { status: 'Suspended' },
  { status: 'Not Started', isOnReport: true, isOnApprovedReport: true },
  { status: 'In Progress', isOnReport: true, isOnApprovedReport: true },
];

const writableStateMap = [
  { status: 'Not Started', isOnReport: false, isOnApprovedReport: false },
  { status: 'In Progress', isOnReport: false, isOnApprovedReport: false },
];

describe('ObjectiveTitle', () => {
  it('shows the read only view', async () => {
    render(<RenderObjectiveTitle />);
    expect(await screen.findByText('Objective title')).toBeVisible();
  });

  test.each(readonlyStateMap)('should be readonly when %o', async (state) => {
    // eslint-disable-next-line react/jsx-props-no-spreading
    render(<RenderObjectiveTitle {...state} />);
    expect(await screen.findByText('Objective title')).toBeVisible();
    expect(screen.getByTestId('readonly-objective-text')).toBeVisible();
  });

  test.each(writableStateMap)('should be writable when %o', async (state) => {
    // eslint-disable-next-line react/jsx-props-no-spreading
    render(<RenderObjectiveTitle {...state} />);
    expect(await screen.findByText('Objective title')).toBeVisible();
    expect(screen.queryByTestId('readonly-objective-text')).toBeNull();
  });
});
