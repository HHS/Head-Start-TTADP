import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StatusDropdown from '../StatusDropdown';

describe('StatusDropdown', () => {
  const renderStatusDropdown = (
    status,
    onUpdateGoalStatus,
  ) => {
    render((
      <StatusDropdown
        goalId="345345"
        status={status}
        onUpdateGoalStatus={onUpdateGoalStatus}
      />
    ));
  };

  it('renders', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('Not Started', onUpdate);

    const options = document.querySelectorAll('option');
    expect(options.length).toBe(4);

    const select = await screen.findByRole('combobox', { name: /change status for goal 345345/i });
    userEvent.selectOptions(select, 'In progress');
    expect(onUpdate).toHaveBeenCalledWith('In Progress');
  });

  it('displays the correct number of options', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('In Progress', onUpdate);

    const options = document.querySelectorAll('option');
    expect(options.length).toBe(3);
  });

  it('renders not select on draft', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('Draft', onUpdate);

    const selects = document.querySelector('select');
    expect(selects).toBe(null);
  });

  it('renders not select on completed', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('Completed', onUpdate);

    const selects = document.querySelector('select');
    expect(selects).toBe(null);
  });
});
