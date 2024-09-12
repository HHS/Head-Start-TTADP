import React from 'react';
import fetchMock from 'fetch-mock';
import {
  render, screen,
} from '@testing-library/react';
// import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import userEvent from '@testing-library/user-event';
import GoalNudgeInitiativePicker from '../GoalNudgeInitiativePicker';

describe('GoalNudgeInitiativePicker', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  const renderTest = (props) => {
    const defaultProps = {
      goalTemplates: [],
      setUseOhsInitiativeGoal: jest.fn(),
      useOhsInitiativeGoal: true,
      setSimilarGoals: jest.fn(),
      dismissSimilar: false,
      setDismissSimilar: jest.fn(),
      onSelectNudgedGoal: jest.fn(),
      error: <></>,
      validateGoalName: jest.fn(),
    };

    render(
      <>
        <GoalNudgeInitiativePicker
            // eslint-disable-next-line react/jsx-props-no-spreading
          {...{ ...defaultProps, ...props }}
        />
        <input type="text" id="tab-stop" />
      </>,
    );
  };

  it('bombs out if useOhsInitiativeGoal is false', async () => {
    renderTest({ useOhsInitiativeGoal: false });
    expect(screen.queryByText(/Recipient's goal/)).not.toBeInTheDocument();
  });

  it('renders without errors', async () => {
    renderTest();
    expect(await screen.findByText(/Recipient's goal/)).toBeInTheDocument();
  });

  it('calls the passed in handlers on change', async () => {
    const onSelectNudgedGoal = jest.fn();
    const goalTemplates = [{ id: 1, name: 'test' }];
    renderTest({
      onSelectNudgedGoal,
      goalTemplates,
    });
    expect(await screen.findByText(/Recipient's goal/)).toBeInTheDocument();

    await selectEvent.select(screen.getByLabelText(/Recipient's goal/), 'test');
    expect(onSelectNudgedGoal).toHaveBeenCalled();
  });

  it('calls validateGoalName on blur', async () => {
    const goalTemplates = [{ id: 1, name: 'test' }];
    const validateGoalName = jest.fn();
    renderTest({
      goalTemplates,
      validateGoalName,
    });
    expect(await screen.findByText(/Recipient's goal/)).toBeInTheDocument();

    // tab 3 times
    for (let i = 0; i < 3; i += 1) {
      userEvent.tab();
    }

    expect(validateGoalName).toHaveBeenCalled();
  });
});
