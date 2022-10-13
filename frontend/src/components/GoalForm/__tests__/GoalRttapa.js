import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalRttapa from '../GoalRttapa';

describe('GoalRttapa', () => {
  const renderGoalRttapa = (goalStatus = 'In Progress', onApprovedAR = false, onChange = jest.fn()) => {
    render(<GoalRttapa
      isRttapa="yes"
      onChange={onChange}
      onBlur={jest.fn()}
      error={<></>}
      isLoading={false}
      goalStatus={goalStatus}
      isOnApprovedReport={onApprovedAR}
    />);
  };

  it('shows the read only view when the goal is closed', async () => {
    renderGoalRttapa('Closed');
    expect(await screen.findByText('Recipient TTA Plan Agreement (RTTAPA) goal')).toBeVisible();
    expect(screen.getByText('Yes')).toBeVisible();
    expect(document.querySelector('radio')).toBeNull();
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('shows the read only view when the goal is on an approved report', async () => {
    renderGoalRttapa('In Progress', true);
    expect(await screen.findByText('Recipient TTA Plan Agreement (RTTAPA) goal')).toBeVisible();
    expect(screen.getByText('Yes')).toBeVisible();
    expect(document.querySelector('radio')).toBeNull();
  });

  it('calls on change', async () => {
    const onChange = jest.fn();
    renderGoalRttapa('In Progress', false, onChange);
    const radio = screen.getByLabelText('No');
    userEvent.click(radio);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('No'));
  });
});
