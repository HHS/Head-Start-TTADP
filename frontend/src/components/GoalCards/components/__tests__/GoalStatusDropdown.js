import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SCOPE_IDS, GOAL_STATUS } from '@ttahub/common';
import userEvent from '@testing-library/user-event';
import GoalStatusDropdown from '../GoalStatusDropdown';
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

describe('GoalStatusDropdown', () => {
  const renderStatusDropdown = (
    status,
    onUpdateGoalStatus,
    previousStatus = GOAL_STATUS.NOT_STARTED,
    regionId = '1',
  ) => {
    render((
      <UserContext.Provider value={{ user }}>
        <GoalStatusDropdown
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
    renderStatusDropdown(GOAL_STATUS.NOT_STARTED, onUpdate);

    let options = await screen.findAllByRole('button');
    expect(options.length).toBe(1);

    const select = await screen.findByRole('button', { name: /change status for goal 345345/i });
    userEvent.click(select);

    options = await screen.findAllByRole('button');
    expect(options.length).toBe(3);
  });

  it('displays the correct number of options for in progress', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown(GOAL_STATUS.IN_PROGRESS, onUpdate);

    const select = await screen.findByRole('button', { name: /change status for goal 345345/i });
    userEvent.click(select);

    const options = await screen.findAllByRole('button');
    expect(options.length).toBe(3);
  });

  it('displays the previous status correctly on suspended', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown(GOAL_STATUS.SUSPENDED, onUpdate, GOAL_STATUS.NOT_STARTED);

    const select = await screen.findByRole('button', { name: /change status for goal 345345/i });
    userEvent.click(select);

    const options = await screen.findAllByRole('button');
    expect(options.length).toBe(3);

    const labels = Array.from(options).map((option) => option.textContent);
    expect(labels).toContain(GOAL_STATUS.NOT_STARTED);
    expect(labels).toContain(GOAL_STATUS.CLOSED);
  });

  it('falls back correctly when there is no previous on suspended', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown(GOAL_STATUS.SUSPENDED, onUpdate, '');

    const select = await screen.findByRole('button', { name: /change status for goal 345345/i });
    userEvent.click(select);

    const options = await screen.findAllByRole('button');
    expect(options.length).toBe(2);
    const labels = Array.from(options).map((option) => option.textContent);
    expect(labels).toContain(GOAL_STATUS.CLOSED);
  });

  it('no select on draft', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown(GOAL_STATUS.DRAFT, onUpdate);

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
    renderStatusDropdown(GOAL_STATUS.CLOSED, onUpdate);

    const buttons = document.querySelector('button');
    expect(buttons).toBe(null);
  });

  it('no select on read only', async () => {
    const onUpdate = jest.fn();
    renderStatusDropdown(GOAL_STATUS.IN_PROGRESS, onUpdate, GOAL_STATUS.NOT_STARTED, '5');

    const buttons = document.querySelector('button');
    expect(buttons).toBe(null);
  });

  describe('passes the correct parameters', () => {
    describe('not started', () => {
      test('does not offer "in progress" as an option', async () => {
        const onUpdate = jest.fn();
        renderStatusDropdown(GOAL_STATUS.NOT_STARTED, onUpdate);

        const select = await screen.findByRole('button', { name: /change status for goal 345345/i });
        userEvent.click(select);

        expect(screen.queryByRole('button', { name: /in progress/i })).toBeNull();
      });
      test('suspended', async () => {
        const onUpdate = jest.fn();
        renderStatusDropdown(GOAL_STATUS.NOT_STARTED, onUpdate);

        const select = await screen.findByRole('button', { name: /change status for goal 345345/i });
        userEvent.click(select);

        const suspended = await screen.findByRole('button', { name: /suspended/i });
        userEvent.click(suspended);

        expect(onUpdate).toHaveBeenCalledWith(GOAL_STATUS.SUSPENDED);
      });
      test('closed', async () => {
        const onUpdate = jest.fn();
        renderStatusDropdown(GOAL_STATUS.NOT_STARTED, onUpdate);

        const select = await screen.findByRole('button', { name: /change status for goal 345345/i });
        userEvent.click(select);

        const closed = await screen.findByRole('button', { name: /closed/i });
        userEvent.click(closed);
        expect(onUpdate).toHaveBeenCalledWith(GOAL_STATUS.CLOSED);
      });
    });
    describe('in progress', () => {
      test('suspended', async () => {
        const onUpdate = jest.fn();
        renderStatusDropdown(GOAL_STATUS.IN_PROGRESS, onUpdate);

        const select = await screen.findByRole('button', { name: /change status for goal 345345/i });
        userEvent.click(select);

        const suspended = await screen.findByRole('button', { name: /suspended/i });
        userEvent.click(suspended);

        expect(onUpdate).toHaveBeenCalledWith(GOAL_STATUS.SUSPENDED);
      });
    });
    describe('suspended', () => {
      test('closed, no previous', async () => {
        const onUpdate = jest.fn();
        renderStatusDropdown(GOAL_STATUS.SUSPENDED, onUpdate, null);

        const select = await screen.findByRole('button', { name: /change status for goal 345345/i });
        userEvent.click(select);

        const closed = await screen.findByRole('button', { name: /closed/i });
        userEvent.click(closed);
        expect(onUpdate).toHaveBeenCalledWith(GOAL_STATUS.CLOSED);
      });
      test('closed', async () => {
        const onUpdate = jest.fn();
        renderStatusDropdown(GOAL_STATUS.SUSPENDED, onUpdate, GOAL_STATUS.IN_PROGRESS);

        const select = await screen.findByRole('button', { name: /change status for goal 345345/i });
        userEvent.click(select);

        const closed = await screen.findByRole('button', { name: /closed/i });
        userEvent.click(closed);
        expect(onUpdate).toHaveBeenCalledWith(GOAL_STATUS.CLOSED);
      });
      test('previous', async () => {
        const onUpdate = jest.fn();
        renderStatusDropdown(GOAL_STATUS.SUSPENDED, onUpdate, GOAL_STATUS.IN_PROGRESS);

        const select = await screen.findByRole('button', { name: /change status for goal 345345/i });
        userEvent.click(select);

        const inProgress = await screen.findByRole('button', { name: /in progress/i });
        userEvent.click(inProgress);
        expect(onUpdate).toHaveBeenCalledWith(GOAL_STATUS.IN_PROGRESS);
      });
    });
  });
});
