import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StatusDropdown from '../StatusDropdown';
import UserContext from '../../../UserContext';
import { SCOPE_IDS } from '../../../Constants';

const user = {
  permissions: [
    {
      regionId: 1,
      scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
    },
    {
      regionId: 5,
      scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
    },
  ],
};

describe('StatusDropdown', () => {
  const renderStatusDropdown = (
    status,
    onUpdateGoalStatus,
    previousStatus = 'Not Started',
    regionId = '1',
  ) => {
    render((
      <UserContext.Provider value={{ user }}>
        <StatusDropdown
          goalId={345345}
          regionId={regionId}
          status={status}
          onUpdateGoalStatus={onUpdateGoalStatus}
          previousStatus={previousStatus}
        />
      </UserContext.Provider>
    ));
  };

  it('renders', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('Not Started', onUpdate);

    let options = await screen.findAllByRole('button');
    expect(options.length).toBe(1);

    const select = await screen.findByRole('button', { name: /change status for goal 345345/i });
    userEvent.click(select);

    options = await screen.findAllByRole('button');
    expect(options.length).toBe(5); // 4 + 1

    const inProgress = await screen.findByRole('button', { name: /in progress/i });
    userEvent.click(inProgress);

    expect(onUpdate).toHaveBeenCalledWith('In Progress');
  });

  it('displays the correct number of options for in progress', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('In Progress', onUpdate);

    const select = await screen.findByRole('button', { name: /change status for goal 345345/i });
    userEvent.click(select);

    const options = await screen.findAllByRole('button');
    expect(options.length).toBe(3);
  });

  it('displays the previous status correctly on suspended', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('Suspended', onUpdate, 'Not Started');

    const select = await screen.findByRole('button', { name: /change status for goal 345345/i });
    userEvent.click(select);

    const options = await screen.findAllByRole('button');
    expect(options.length).toBe(3);

    const labels = Array.from(options).map((option) => option.textContent);
    expect(labels).toContain('Not started');
    expect(labels).toContain('Closed');
  });

  it('falls back correctly when there is no previous on suspended', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('Suspended', onUpdate, '');

    const select = await screen.findByRole('button', { name: /change status for goal 345345/i });
    userEvent.click(select);

    const options = await screen.findAllByRole('button');
    expect(options.length).toBe(2);
    const labels = Array.from(options).map((option) => option.textContent);
    expect(labels).toContain('Closed');
  });

  it('no select on draft', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('Draft', onUpdate);

    const buttons = document.querySelector('button');
    expect(buttons).toBe(null);
  });

  it('no select on completed', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('Completed', onUpdate);

    const buttons = document.querySelector('button');
    expect(buttons).toBe(null);
  });

  it('no select on closed', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('Closed', onUpdate);

    const buttons = document.querySelector('button');
    expect(buttons).toBe(null);
  });

  it('no select on read only', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('In Progress', onUpdate, 'Not Started', '5');

    const buttons = document.querySelector('button');
    expect(buttons).toBe(null);
  });
});
