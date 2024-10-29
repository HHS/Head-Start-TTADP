import '@testing-library/jest-dom';
import React from 'react';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import {
  render,
  screen,
} from '@testing-library/react';
import NewGoalAlert from '../NewGoalAlert';

describe('NewGoalAlert', () => {
  it('closed goal, no reason', async () => {
    render(<NewGoalAlert goalStatus={GOAL_STATUS.CLOSED} goalStatusReason="" />);

    const message = await screen.findByText('You have chosen an existing goal with a status of closed. You can:');
    const reopenThisGoal = await screen.findByText('Reopen this goal and change the status to in progress');
    const goBack = await screen.findByText('Go back to create a new goal');
    expect(message).toBeInTheDocument();
    expect(reopenThisGoal).toBeInTheDocument();
    expect(goBack).toBeInTheDocument();
  });

  it('suspended goal with reason', async () => {
    render(<NewGoalAlert goalStatus={GOAL_STATUS.SUSPENDED} goalStatusReason="too fancy" />);

    const message = await screen.findByText(/You have chosen an existing goal with a status of suspended/i);
    const reason = await screen.findByText(/The reason for closing the goal was "too fancy\."/i);
    const reopenThisGoal = await screen.findByText('Reopen this goal and change the status to in progress');
    const goBack = await screen.findByText('Go back to create a new goal');
    expect(message).toBeInTheDocument();
    expect(reason).toBeInTheDocument();
    expect(reopenThisGoal).toBeInTheDocument();
    expect(goBack).toBeInTheDocument();
  });

  it('other goal status', async () => {
    render(<NewGoalAlert goalStatus={GOAL_STATUS.IN_PROGRESS} />);
    const message = await screen.findByText(/You have chosen an existing goal with a status of in progress/i);
    const instructions = await screen.findByText(/You can either use the goal or go back to create a new goal/i);
    expect(message).toBeInTheDocument();
    expect(instructions).toBeInTheDocument();
  });

  it('no status', async () => {
    render(<NewGoalAlert />);
    const message = await screen.findByText(/You have chosen an existing goal with a status of not started/i);
    const instructions = await screen.findByText(/You can either use the goal or go back to create a new goal/i);
    expect(message).toBeInTheDocument();
    expect(instructions).toBeInTheDocument();
  });
});
