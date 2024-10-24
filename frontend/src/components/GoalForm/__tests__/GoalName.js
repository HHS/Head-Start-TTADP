import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import GoalName from '../GoalName';

const defaultProps = {
  userCanEdit: true,
  isCurated: false,
  status: 'In Progress',
  isOnReport: false,
};

describe('GoalName', () => {
  const renderTest = (props = {}) => {
    const {
      userCanEdit,
      isCurated,
      status,
      isOnReport,
    } = {
      ...defaultProps,
      ...props,
    };

    render((
      <GoalName
        goalName="test goal name"
        goalNameError={<></>}
        setGoalName={jest.fn()}
        validateGoalName={jest.fn()}
        isAppLoading={false}
        recipient={{ id: 1 }}
        regionId={1}
        selectedGrants={[]}
        onSelectNudgedGoal={jest.fn()}
        status={status}
        isOnReport={isOnReport}
        userCanEdit={userCanEdit}
        isCurated={isCurated}
      />
    ));
  };

  it('renders the contents', async () => {
    renderTest({ isNew: false });
    const nudge = document.querySelector('.ttahub-goal-nudge--container');
    expect(nudge).toBeFalsy();

    const noNudgeText = document.querySelector('.ttahub-automatic-resizing-textarea');
    expect(noNudgeText).toBeTruthy();

    const readOnlyLabel = document.querySelector('.usa-prose.text-bold');
    expect(readOnlyLabel).toBeFalsy();
  });

  it('shows the read only view', async () => {
    renderTest({ isOnReport: true });
    const nudge = document.querySelector('.ttahub-goal-nudge--container');
    expect(nudge).toBeFalsy();

    const noNudgeText = document.querySelector('.ttahub-automatic-resizing-textarea');
    expect(noNudgeText).toBeFalsy();

    const readOnlyLabel = document.querySelector('.usa-prose.text-bold');
    expect(readOnlyLabel).toBeTruthy();
  });
});
