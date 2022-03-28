import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StatusDropdown from '../StatusDropdown';

describe('StatusDropdown', () => {
  const renderStatusDropdown = (
    status,
    onUpdateGoalStatus,
    previousStatus = 'Not Started',
  ) => {
    render((
      <StatusDropdown
        goalId={345345}
        status={status}
        onUpdateGoalStatus={onUpdateGoalStatus}
        previousStatus={previousStatus}
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

  it('displays the correct number of options for in progress', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('In Progress', onUpdate);

    const options = document.querySelectorAll('option');
    expect(options.length).toBe(3);
  });

  it('displays the previous status correctly on suspended', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('Ceased/Suspended', onUpdate, 'Not Started');

    const options = document.querySelectorAll('option');
    expect(options.length).toBe(2);

    const labels = Array.from(options).map((option) => option.textContent);
    expect(labels).toContain('Not started');
    expect(labels).toContain('Closed');
  });

  it('falls back correctly when there is no previous on suspended', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('Ceased/Suspended', onUpdate, '');

    const options = document.querySelectorAll('option');
    expect(options.length).toBe(1);
    const labels = Array.from(options).map((option) => option.textContent);
    expect(labels).toContain('Closed');
  });

  it('no select on draft', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('Draft', onUpdate);

    const selects = document.querySelector('select');
    expect(selects).toBe(null);
  });

  it('no select on completed', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('Completed', onUpdate);

    const selects = document.querySelector('select');
    expect(selects).toBe(null);
  });
});
