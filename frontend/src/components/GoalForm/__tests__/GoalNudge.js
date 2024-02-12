import React from 'react';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import {
  render, screen, act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalNudge, { filterOutGrantUsedGoalTemplates } from '../GoalNudge';

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

  const renderTest = (props) => {
    const defaultProps = {
      error: <></>,
      goalName: 'test goal name',
      validateGoalName: jest.fn(),
      onUpdateText: jest.fn(),
      isLoading: false,
      recipientId: 1,
      regionId: 1,
      selectedGrants: [],
      onSelectNudgedGoal: jest.fn(),
    };

    render(
      <GoalNudge
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...{ ...defaultProps, ...props }}
      />,
    );
  };

  it('renders without errors', () => {
    renderTest();
    expect(fetchMock.called()).toBe(false);
  });

  it('calls onUpdateText when input value changes', () => {
    const onUpdateText = jest.fn();
    renderTest({ onUpdateText });
    const input = screen.getByRole('textbox');
    userEvent.type(input, 'test');
    expect(onUpdateText).toHaveBeenCalledTimes(4);
  });

  it('fetches goal templates when a grant is selected', async () => {
    fetchMock.get('/api/goal-templates?grantIds=1', []);
    const selectedGrants = [{ id: 1 }];
    act(() => {
      renderTest({ selectedGrants });
    });
    expect(fetchMock.called('/api/goal-templates?grantIds=1')).toBe(true);
  });

  it('shows the use ohs initiative checkbox when there are goal templates', async () => {
    fetchMock.get('/api/goal-templates?grantIds=1', [
      {
        id: 1,
        goals: [
          { id: 2, grantId: 2 },
        ],
      },
    ]);
    const selectedGrants = [
      {
        id: 1,
      },
    ];
    act(() => {
      renderTest({ selectedGrants });
    });

    expect(fetchMock.called('/api/goal-templates?grantIds=1')).toBe(true);
    expect(await screen.findByText('Use OHS initiative goal')).toBeInTheDocument();
  });

  it('asks for similar goals when the qualifications are met', async () => {
    fetchMock.get('/api/goal-templates?grantIds=1', []);
    const selectedGrants = [
      { id: 1, number: '123' },
    ];

    const goalName = 'This is a brand new test goal name and it it really long';

    const url = join(
      join('/', 'api', 'goals'),
      'recipient/1/region/1/nudge',
      `?name=${encodeURIComponent(goalName)}&grantNumbers=123`,
    );

    fetchMock.get(url, []);

    act(() => {
      renderTest({ selectedGrants, goalName });
    });

    jest.advanceTimersByTime(2000);

    expect(fetchMock.called(url)).toBe(true);
  });

  it('clears out the similar goals when dismiss similar is clicked', async () => {
    fetchMock.get('/api/goal-templates?grantIds=1', []);
    const selectedGrants = [
      { id: 1, number: '123' },
    ];

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
      renderTest({ selectedGrants, goalName });
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

describe('filterOutGrantUsedGoalTemplates', () => {
  it('filters out goal templates that have used grants', () => {
    const goalTemplates = [
      {
        id: 1,
        goals: [
          { id: 1, grantId: 1 },
          { id: 2, grantId: 2 },
        ],
      },
      {
        id: 2,
        goals: [
          { id: 3, grantId: 3 },
          { id: 4, grantId: 4 },
        ],
      },
      {
        id: 3,
        goals: [
          { id: 5, grantId: 1 },
          { id: 6, grantId: 5 },
        ],
      },
    ];

    const selectedGrants = [
      { id: 1 },
      { id: 2 },
    ];

    const filteredTemplates = filterOutGrantUsedGoalTemplates(goalTemplates, selectedGrants);

    expect(filteredTemplates).toEqual([
      {
        id: 2,
        goals: [
          { id: 3, grantId: 3 },
          { id: 4, grantId: 4 },
        ],
      },
    ]);
  });

  it('returns all goal templates if no grants are selected', () => {
    const goalTemplates = [
      {
        id: 1,
        goals: [
          { id: 1, grantId: 1 },
          { id: 2, grantId: 2 },
        ],
      },
      {
        id: 2,
        goals: [
          { id: 3, grantId: 3 },
          { id: 4, grantId: 4 },
        ],
      },
    ];

    const selectedGrants = [];

    const filteredTemplates = filterOutGrantUsedGoalTemplates(goalTemplates, selectedGrants);

    expect(filteredTemplates).toEqual(goalTemplates);
  });
});
