import React from 'react';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import {
  render, screen, act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import GoalNudge from '../GoalNudge';

describe('GoalNudge', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    fetchMock.restore();
  });

  const defaultProps = {
    recipientId: 1,
    regionId: 1,
    selectedGrant: null,
  };

  const Test = (props) => {
    const hookForm = useForm({
      mode: 'onBlur',
      defaultValues: {
        similarGoals: null, // the IDS of a goal from the similarity API
        goalIds: [], // the goal ids that the user has selected
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
        <GoalNudge
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...props}
        />
      </FormProvider>
    );
  };

  const renderTest = (props) => {
    render(
      <Test
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...{ ...defaultProps, ...props }}
      />,
    );
  };

  it('renders without errors', () => {
    renderTest();
    expect(fetchMock.called()).toBe(false);
  });

  it('fetches goal templates when a grant is selected', async () => {
    fetchMock.get('/api/goal-templates?grantIds=1', []);
    const selectedGrant = { id: 1, number: '123' };
    act(() => {
      renderTest({ selectedGrant });
    });
    expect(fetchMock.called('/api/goal-templates?grantIds=1')).toBe(true);
    expect(await screen.findByText('Use OHS standard goal')).toBeInTheDocument();
  });

  it('always shows the use ohs standard checkbox', async () => {
    fetchMock.get('/api/goal-templates?grantIds=1', []);
    const selectedGrant = { id: 1, number: '123' };
    act(() => {
      renderTest({ selectedGrant });
    });

    expect(fetchMock.called('/api/goal-templates?grantIds=1')).toBe(true);
    expect(await screen.findByText('Use OHS standard goal')).toBeInTheDocument();
  });

  it('asks for similar goals when the qualifications are met', async () => {
    fetchMock.get('/api/goal-templates?grantIds=1', []);
    const selectedGrant = { id: 1, number: '123' };
    const goalName = 'This is a brand new test goal name and it it really long';

    const url = join(
      join('/', 'api', 'goals'),
      'recipient/1/region/1/nudge',
      `?name=${encodeURIComponent(goalName)}&grantNumbers=123`,
    );

    fetchMock.get(url, []);

    act(() => {
      renderTest({ selectedGrant, goalName });
    });

    const textbox = document.querySelector('textarea[name="goalName"]');
    expect(textbox).toBeInTheDocument();

    act(() => {
      userEvent.type(textbox, 'This is a brand new test goal name and it it really long');
    });

    jest.advanceTimersByTime(2000);

    expect(fetchMock.called(url)).toBe(true);
  });

  it('clears out the similar goals when dismiss similar is clicked', async () => {
    fetchMock.get('/api/goal-templates?grantIds=1', []);
    const selectedGrant = { id: 1, number: '123' };

    const goalName = 'This is a brand new test goal name and it it really long';

    const url = join(
      join('/', 'api', 'goals'),
      'recipient/1/region/1/nudge',
      `?name=${encodeURIComponent(goalName)}&grantNumbers=123`,
    );

    fetchMock.get(url, [
      {
        ids: [1],
        name: 'unorthodox goal',
        status: 'test status',
      },
    ]);

    act(() => {
      renderTest({ selectedGrant, goalName });
    });

    const textbox = document.querySelector('textarea[name="goalName"]');
    expect(textbox).toBeInTheDocument();

    act(() => {
      userEvent.type(textbox, 'This is a brand new test goal name and it it really long');
    });

    jest.advanceTimersByTime(2000);

    expect(fetchMock.called(url)).toBe(true);

    const button = await screen.findByRole('button', { name: 'Dismiss similar goals' });
    expect(document.querySelector('.ttahub-similar-goal')).toBeInTheDocument();
    act(() => {
      userEvent.click(button);
    });

    expect(document.querySelector('.ttahub-similar-goal')).not.toBeInTheDocument();

    const getSuggestions = await screen.findByRole('button', { name: 'Get suggestions' });
    expect(getSuggestions).toBeInTheDocument();

    act(() => {
      userEvent.click(getSuggestions);
    });

    jest.advanceTimersByTime(2000);

    expect(await screen.findByText('unorthodox goal')).toBeInTheDocument();
  });
});
