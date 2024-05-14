import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SCOPE_IDS } from '@ttahub/common';
import userEvent from '@testing-library/user-event';
import ObjectiveStatusDropdown from '../ObjectiveStatusDropdown';
import UserContext from '../../../../UserContext';

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

describe('ObjectiveStatusDropdown', () => {
  const renderStatusDropdown = (
    currentStatus,
    onUpdate = jest.fn(),
    forceReadOnly = false,
  ) => {
    render((
      <UserContext.Provider value={{ user }}>
        <ObjectiveStatusDropdown
          currentStatus={currentStatus}
          onUpdateObjectiveStatus={onUpdate}
          forceReadOnly={forceReadOnly}
          regionId={1}
          objectiveId={345345}
          goalStatus="In Progress"
          className="test-class"
        />
      </UserContext.Provider>
    ));
  };

  it('displays the correct number of options for not started', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('Not Started', onUpdate);

    let options = await screen.findAllByRole('button');
    expect(options.length).toBe(1);

    const select = await screen.findByRole('button', { name: /change status for objective 345345/i });
    userEvent.click(select);

    options = await screen.findAllByRole('button');
    expect(options.length).toBe(5);
    const labels = options.map((option) => option.textContent);
    expect(labels).toContain('Not Started');
    expect(labels).toContain('In Progress');
    expect(labels).toContain('Suspended');
    expect(labels).toContain('Complete');
  });

  it('displays the correct number of options for in progress', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('In Progress', onUpdate);

    let options = await screen.findAllByRole('button');
    expect(options.length).toBe(1);

    const select = await screen.findByRole('button', { name: /change status for objective 345345/i });
    userEvent.click(select);

    options = await screen.findAllByRole('button');
    expect(options.length).toBe(5);
    const labels = options.map((option) => option.textContent);
    expect(labels).toContain('Not Started');
    expect(labels).toContain('In Progress');
    expect(labels).toContain('Suspended');
    expect(labels).toContain('Complete');
  });

  it('displays the correct number of options for suspended', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('Suspended', onUpdate);

    let options = await screen.findAllByRole('button');
    expect(options.length).toBe(1);

    const select = await screen.findByRole('button', { name: /change status for objective 345345/i });
    userEvent.click(select);

    options = await screen.findAllByRole('button');
    expect(options.length).toBe(5);
    const labels = options.map((option) => option.textContent);
    expect(labels).toContain('Not Started');
    expect(labels).toContain('In Progress');
    expect(labels).toContain('Suspended');
    expect(labels).toContain('Complete');
  });

  it('displays the correct number of options for complete', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('Complete', onUpdate);

    let options = await screen.findAllByRole('button');
    expect(options.length).toBe(1);

    const select = await screen.findByRole('button', { name: /change status for objective 345345/i });
    userEvent.click(select);

    options = await screen.findAllByRole('button');
    expect(options.length).toBe(4);
    const labels = options.map((option) => option.textContent);
    expect(labels).not.toContain('Not Started');
    expect(labels).toContain('In Progress');
    expect(labels).toContain('Suspended');
    expect(labels).toContain('Complete');
  });

  it('handles no status', async () => {
    renderStatusDropdown();

    let options = await screen.findAllByRole('button');
    expect(options.length).toBe(1);

    const select = await screen.findByRole('button', { name: /change status for objective 345345/i });
    userEvent.click(select);

    options = await screen.findAllByRole('button');
    expect(options.length).toBe(5);
    const labels = options.map((option) => option.textContent);
    expect(labels).toContain('Not Started');
    expect(labels).toContain('In Progress');
    expect(labels).toContain('Suspended');
    expect(labels).toContain('Complete');
  });

  it('handles weirdo statuses', async () => {
    renderStatusDropdown('Weirdo Status');

    let options = await screen.findAllByRole('button');
    expect(options.length).toBe(1);

    const select = await screen.findByRole('button', { name: /change status for objective 345345/i });
    userEvent.click(select);

    options = await screen.findAllByRole('button');
    expect(options.length).toBe(5);
    const labels = options.map((option) => option.textContent);
    expect(labels).toContain('Not Started');
    expect(labels).toContain('In Progress');
    expect(labels).toContain('Suspended');
    expect(labels).toContain('Complete');
  });

  it('handles force read only', async () => {
    renderStatusDropdown('Complete', jest.fn(), true);

    const buttons = document.querySelector('button');
    expect(buttons).toBe(null);
  });

  it('calls update', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown('In Progress', onUpdate);

    const select = await screen.findByRole('button', { name: /change status for objective 345345/i });
    userEvent.click(select);

    const option = await screen.findByRole('button', { name: 'Suspended' });
    userEvent.click(option);

    expect(onUpdate).toHaveBeenCalledWith('Suspended');
  });
});
