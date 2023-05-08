import '@testing-library/jest-dom';
import React from 'react';
import { GOAL_SOURCES } from '@ttahub/common';
import { render, screen, act } from '@testing-library/react';
import selectEvent from 'react-select-event';
import GoalSource from '../GoalSource';

const defaults = {
  sources: [],
  validateGoalSource: jest.fn(),
  onChangeGoalSource: jest.fn(),
  goalStatus: 'Draft',
  isOnReport: false,
};

describe('GoalSource', () => {
  const renderGoalSource = (props = defaults) => {
    const {
      sources,
      validateGoalSource,
      onChangeGoalSource,
      goalStatus,
      isOnReport,
    } = props;
    render(<GoalSource
      error={<></>}
      sources={sources}
      validateGoalSource={validateGoalSource}
      onChangeGoalSource={onChangeGoalSource}
      goalStatus={goalStatus}
      isLoading={false}
      isOnReport={isOnReport}
      userCanEdit
    />);
  };

  it('shows the read only view when on report', async () => {
    act(() => {
      renderGoalSource({
        ...defaults,
        sources: GOAL_SOURCES,
        isOnReport: true,
      });
    });

    expect(screen.getByText('Goal source')).toBeInTheDocument();
    expect(screen.getByText(GOAL_SOURCES[0])).toBeInTheDocument();
    expect(screen.getByText(GOAL_SOURCES[1])).toBeInTheDocument();
    expect(screen.getByText(GOAL_SOURCES[2])).toBeInTheDocument();
    expect(screen.getByText(GOAL_SOURCES[3])).toBeInTheDocument();
    expect(document.querySelector('usa-select')).toBeNull();
  });

  it('shows the read only view when goal is closed', async () => {
    act(() => {
      renderGoalSource({
        ...defaults,
        sources: GOAL_SOURCES,
        goalStatus: 'Closed',
      });
    });

    expect(screen.getByText('Goal source')).toBeInTheDocument();
    expect(screen.getByText(GOAL_SOURCES[0])).toBeInTheDocument();
    expect(screen.getByText(GOAL_SOURCES[1])).toBeInTheDocument();
    expect(screen.getByText(GOAL_SOURCES[2])).toBeInTheDocument();
    expect(screen.getByText(GOAL_SOURCES[3])).toBeInTheDocument();
    expect(document.querySelector('usa-select')).toBeNull();
  });

  it('shows the read only view when user cannot edit', async () => {
    act(() => {
      renderGoalSource({
        ...defaults,
        sources: GOAL_SOURCES,
        userCanEdit: false,
      });
    });

    expect(screen.getByText('Goal source')).toBeInTheDocument();
    expect(screen.getByText(GOAL_SOURCES[0])).toBeInTheDocument();
    expect(screen.getByText(GOAL_SOURCES[1])).toBeInTheDocument();
    expect(screen.getByText(GOAL_SOURCES[2])).toBeInTheDocument();
    expect(screen.getByText(GOAL_SOURCES[3])).toBeInTheDocument();
    expect(document.querySelector('usa-select')).toBeNull();
  });

  it('shows nothing when there report is read-only and the goal has no sources', async () => {
    act(() => {
      renderGoalSource({
        ...defaults,
        isOnReport: true,
      });
    });

    expect(screen.queryByText('Goal source')).toBeNull();
    expect(document.querySelector('usa-select')).toBeNull();
  });

  it('shows the select and the value', async () => {
    const onChange = jest.fn();

    act(() => {
      renderGoalSource({
        ...defaults,
        onChangeGoalSource: onChange,
        sources: [GOAL_SOURCES[0]],
      });
    });

    expect(screen.getByText('Goal source')).toBeInTheDocument();

    await selectEvent.select(screen.getByLabelText(/Goal source/i), [GOAL_SOURCES[0], GOAL_SOURCES[1]]);

    expect(onChange).toBeCalledWith([GOAL_SOURCES[0], GOAL_SOURCES[1]]);
  });
});
