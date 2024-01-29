import '@testing-library/jest-dom';
import React from 'react';
import { GOAL_SOURCES } from '@ttahub/common';
import userEvent from '@testing-library/user-event';
import { render, screen, act } from '@testing-library/react';
import GoalSource from '../GoalSource';

const defaults = {
  sources: [],
  validateGoalSource: jest.fn(),
  onChangeGoalSource: jest.fn(),
  goalStatus: 'Draft',
  isMultiRecipientGoal: false,
  userCanEdit: true,
  disabled: false,
};

describe('GoalSource', () => {
  const renderGoalSource = (props = defaults) => {
    const {
      source,
      validateGoalSource,
      onChangeGoalSource,
      goalStatus,
      isMultiRecipientGoal,
      userCanEdit,
      disabled,
    } = props;
    render(<GoalSource
      error={<></>}
      source={source}
      validateGoalSource={validateGoalSource}
      onChangeGoalSource={onChangeGoalSource}
      goalStatus={goalStatus}
      isLoading={false}
      isMultiRecipientGoal={isMultiRecipientGoal}
      userCanEdit={userCanEdit}
      disabled={disabled}
    />);
  };

  it('shows nothing if on a multi-recipient goal', async () => {
    act(() => {
      renderGoalSource({
        ...defaults,
        isMultiRecipientGoal: true,
      });
    });

    expect(screen.queryByText('Goal source')).toBeNull();
    expect(document.querySelector('usa-select')).toBeNull();
  });

  it('shows read only if user can\'t edit', async () => {
    renderGoalSource({
      ...defaults,
      source: GOAL_SOURCES[0],
      userCanEdit: false,
    });

    expect(screen.getByText('Goal source')).toBeInTheDocument();
    expect(screen.getByText(GOAL_SOURCES[0])).toBeInTheDocument();
    expect(document.querySelector('usa-select')).toBeNull();
  });

  it('disables drop down', async () => {
    renderGoalSource({
      ...defaults,
      disabled: true,
    });
    expect(screen.getByText('Goal source')).toBeInTheDocument();
    const dropdown = screen.getByLabelText(/Goal source/i);
    expect(dropdown).toBeDisabled();
  });

  it('enables drop down', async () => {
    renderGoalSource({
      ...defaults,
      disabled: false,
    });
    expect(screen.getByText('Goal source')).toBeInTheDocument();
    const dropdown = screen.getByLabelText(/Goal source/i);
    expect(dropdown).not.toBeDisabled();
  });

  it('shows the read only view when goal is closed', async () => {
    act(() => {
      renderGoalSource({
        ...defaults,
        source: GOAL_SOURCES[0],
        goalStatus: 'Closed',
      });
    });

    expect(screen.getByText('Goal source')).toBeInTheDocument();
    expect(screen.getByText(GOAL_SOURCES[0])).toBeInTheDocument();
    expect(document.querySelector('usa-select')).toBeNull();
  });

  it('shows the read only view when user cannot edit', async () => {
    act(() => {
      renderGoalSource({
        ...defaults,
        source: GOAL_SOURCES[0],
        userCanEdit: false,
      });
    });

    expect(screen.getByText('Goal source')).toBeInTheDocument();
    expect(screen.getByText(GOAL_SOURCES[0])).toBeInTheDocument();
    expect(document.querySelector('usa-select')).toBeNull();
  });

  it('shows the select and the value', async () => {
    const onChange = jest.fn();

    act(() => {
      renderGoalSource({
        ...defaults,
        onChangeGoalSource: onChange,
        source: GOAL_SOURCES[0],
      });
    });

    expect(screen.getByText('Goal source')).toBeInTheDocument();

    const dropdown = screen.getByLabelText(/Goal source/i);
    userEvent.selectOptions(dropdown, GOAL_SOURCES[0]);
    expect(onChange).toBeCalledWith(GOAL_SOURCES[0]);
  });
});
