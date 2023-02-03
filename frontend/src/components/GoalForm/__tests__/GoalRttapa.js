import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalRttapa from '../GoalRttapa';

describe('GoalRttapa', () => {
  const renderGoalRttapa = (isRttapa = 'Yes', goalStatus = 'In Progress', onChange = jest.fn(), initialValue = '') => {
    render(<GoalRttapa
      isRttapa={isRttapa}
      onChange={onChange}
      error={<></>}
      isLoading={false}
      goalStatus={goalStatus}
      isOnApprovedReport={false}
      initial={initialValue}
    />);
  };

  describe('only shows checked when the value is one of the two allowed', () => {
    it('yes', async () => {
      renderGoalRttapa('Yes', 'Draft');
      const radio = await screen.findByRole('radio', { name: 'RTTAPA' });
      expect(radio).toBeChecked();
    });
    it('no', async () => {
      renderGoalRttapa('No', 'Draft');
      const radio = await screen.findByRole('radio', { name: 'Non-RTTAPA' });
      expect(radio).toBeChecked();
    });
    it('bad', async () => {
      renderGoalRttapa('BAD', 'Draft');
      const yes = await screen.findByRole('radio', { name: 'RTTAPA' });
      expect(yes).not.toBeChecked();
      const no = await screen.findByRole('radio', { name: 'Non-RTTAPA' });
      expect(no).not.toBeChecked();
    });
  });

  it('shows the read only view when the goal is closed', async () => {
    renderGoalRttapa('Yes', 'Closed');
    expect(await screen.findByText('Goal type')).toBeVisible();
    expect(screen.getByText('RTTAPA')).toBeVisible();
    expect(document.querySelector('input[type="radio"]')).toBeNull();
  });

  it('can update RTTAPA if the goal is still a draft', async () => {
    renderGoalRttapa('Yes', 'Draft', jest.fn(), 'Yes');
    expect(await screen.findByText('Goal type')).toBeVisible();
    expect(screen.getByText('RTTAPA')).toBeVisible();
    expect(document.querySelector('input[type="radio"]')).toBeTruthy();
  });

  it('shows the read only when it is initially "yes"', async () => {
    renderGoalRttapa('Yes', 'In Progress', jest.fn(), 'Yes');
    expect(await screen.findByText('Goal type')).toBeVisible();
    expect(screen.getByText('RTTAPA')).toBeVisible();
    expect(document.querySelector('input[type="radio"]')).toBeNull();
  });

  it('calls on change', async () => {
    const onChange = jest.fn();
    renderGoalRttapa('Yes', 'In Progress', onChange);
    const radio = screen.getByLabelText('Non-RTTAPA');
    userEvent.click(radio);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('No'));
  });
});
