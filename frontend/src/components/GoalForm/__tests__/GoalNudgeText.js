import React from 'react';
import fetchMock from 'fetch-mock';
import {
  render, screen, act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalNudgeText from '../GoalNudgeText';

describe('GoalNudgeText', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  const renderTest = (props) => {
    const defaultProps = {
      error: <></>,
      inputName: 'test',
      isLoading: false,
      goalName: '',
      onChange: jest.fn(),
      onSelectNudgedGoal: jest.fn(),
      setDismissSimilar: jest.fn(),
      similar: [],
      useOhsInitiativeGoal: false,
      validateGoalName: jest.fn(),
    };

    render(
      <>
        <GoalNudgeText
                // eslint-disable-next-line react/jsx-props-no-spreading
          {...{ ...defaultProps, ...props }}
        />
        <input type="text" id="tab-stop" />
      </>,
    );
  };

  it('bombs out if useOhsInitiativeGoal is true', async () => {
    renderTest({ useOhsInitiativeGoal: true });
    expect(screen.queryByText(/Recipient's goal/)).not.toBeInTheDocument();
  });

  it('renders without errors', async () => {
    renderTest();
    expect(await screen.findByText(/Recipient's goal/)).toBeInTheDocument();
  });

  it('calls the passed in handlers on change', async () => {
    const onChange = jest.fn();
    renderTest({
      onChange,
    });
    expect(await screen.findByText(/Recipient's goal/)).toBeInTheDocument();

    const input = screen.getByLabelText(/Recipient's goal/);
    await act(async () => {
      userEvent.type(input, 'test');
    });
    expect(onChange).toHaveBeenCalled();
  });

  /**
   *   name: PropTypes.string,
  status: PropTypes.string,
  ids: PropTypes.arrayOf(PropTypes.number),
   */

  it('calls the passed in handlers on blur', async () => {
    const validateGoalName = jest.fn();
    const setDismissSimilar = jest.fn();
    renderTest({
      validateGoalName,
      setDismissSimilar,
      similar: [
        {
          name: 'test',
          status: 'Not Started',
          ids: [1],
        },
      ],
    });
    expect(await screen.findByText(/Recipient's goal/)).toBeInTheDocument();

    const input = screen.getByLabelText(/Recipient's goal/);
    await act(async () => {
      userEvent.type(input, 'test');
      userEvent.tab();
    });
    expect(validateGoalName).toHaveBeenCalled();
    expect(setDismissSimilar).toHaveBeenCalled();
  });

  it('does not dismiss suggestions if there are not any', async () => {
    const validateGoalName = jest.fn();
    const setDismissSimilar = jest.fn();
    renderTest({
      validateGoalName,
      setDismissSimilar,
    });
    expect(await screen.findByText(/Recipient's goal/)).toBeInTheDocument();

    const input = screen.getByLabelText(/Recipient's goal/);
    await act(async () => {
      userEvent.type(input, 'test');
      userEvent.tab();
    });
    expect(validateGoalName).toHaveBeenCalled();
    expect(setDismissSimilar).not.toHaveBeenCalled();
  });
});
