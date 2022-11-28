import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import GoalDate from '../GoalDate';

describe('GoalDate', () => {
  const renderGoalDate = (goalStatus = 'In Progress') => {
    render(<GoalDate
      error={<></>}
      setEndDate={jest.fn()}
      endDate="01-01-2021"
      validateEndDate={jest.fn()}
      datePickerKey="1"
      inputName="goalDate"
      isLoading={false}
      goalStatus={goalStatus}
    />);
  };

  it('shows the read only view', async () => {
    renderGoalDate('Closed');
    expect(await screen.findByText('Anticipated close date (mm/dd/yyyy)')).toBeVisible();
    expect(screen.getByText(/01-01-2021/i)).toBeVisible();
    expect(document.querySelector('input')).toBeNull();
  });
});
