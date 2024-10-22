import React from 'react';
import fetchMock from 'fetch-mock';
import {
  render, screen, act,
} from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import GoalNudgeText from '../GoalNudgeText';

describe('GoalNudgeText', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  const defaultProps = {
    setDismissSimilar: jest.fn(),
    similar: [],
    useOhsInitiativeGoal: false,
  };

  const Test = (props) => {
    const hookForm = useForm({
      mode: 'onBlur',
      defaultValues: {
        similarGoals: null, // the IDS of a goal from the similarity API
        goalIds: [], // the goal ids that the user has selected
        selectedGrants: [], // the grants that the user has selected
        goalName: '', // the goal name in the textbox
        goalStatus: '', // the status of the goal, only tracked to display in alerts
        goalSource: '', // only used for curated templates
        goalStatusReason: '',
        useOhsInitiativeGoal: false, // the checkbox to toggle the controls
        isGoalNameEditable: true,
      },
      shouldUnregister: false,
    });
    return (
      // eslint-disable-next-line react/jsx-props-no-spreading
      <FormProvider {...hookForm}>
        <GoalNudgeText
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...{ ...defaultProps, ...props }}
        />
        <input type="text" id="tab-stop" />
      </FormProvider>
    );
  };

  const renderTest = (props) => {
    render(
      // eslint-disable-next-line react/jsx-props-no-spreading
      <Test {...props} />,
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

  it('calls the passed in handlers on blur', async () => {
    const setDismissSimilar = jest.fn();
    renderTest({
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
    expect(setDismissSimilar).toHaveBeenCalled();
  });

  it('does not dismiss suggestions if there are not any', async () => {
    const setDismissSimilar = jest.fn();
    renderTest({
      setDismissSimilar,
    });
    expect(await screen.findByText(/Recipient's goal/)).toBeInTheDocument();

    const input = screen.getByLabelText(/Recipient's goal/);
    await act(async () => {
      userEvent.type(input, 'test');
      userEvent.tab();
    });
    expect(setDismissSimilar).not.toHaveBeenCalled();
  });
});
