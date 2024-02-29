import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  waitFor,
  act,
} from '@testing-library/react';
import { SCOPE_IDS } from '@ttahub/common';
import selectEvent from 'react-select-event';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';
import CreateGoal from '../index';
import UserContext from '../../../UserContext';
import AppLoadingContext from '../../../AppLoadingContext';

const topicsFromApi = [
  'Behavioral / Mental Health / Trauma',
  'Child Screening and Assessment',
  'CLASS: Classroom Organization',
  'CLASS: Emotional Support',
  'CLASS: Instructional Support',
  'Coaching',
  'Communication',
  'Community and Self-Assessment',
  'Culture & Language',
  'Curriculum (Instructional or Parenting)',
  'Data and Evaluation',
].map((name, id) => ({ name, id }));

describe('create goal:nudge', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  const defaultRecipient = {
    id: 1,
    grants: [
      {
        id: 1,
        numberWithProgramTypes: 'Turtle 1',
        status: 'Active',
        number: 'turtle-1',
      },
      {
        id: 2,
        numberWithProgramTypes: 'Turtle 2',
        status: 'Active',
        number: 'turtle-2',
      },
      {
        id: 2,
        numberWithProgramTypes: 'Turtle 3',
        status: 'Inactive',
        number: 'turtle-3',
      },
    ],
  };

  const history = createMemoryHistory();

  function renderForm(recipient = defaultRecipient, goalId = 'new') {
    render((
      <Router history={history}>
        <UserContext.Provider value={{
          user: {
            permissions: [{ regionId: 1, scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS }],
          },
        }}
        >
          <AppLoadingContext.Provider value={
            {
              setIsAppLoading: jest.fn(),
              setAppLoadingText: jest.fn(),
              isAppLoading: false,
            }
          }
          >
            <CreateGoal
              recipient={recipient}
              regionId="1"
              isNew={goalId === 'new'}
            />
          </AppLoadingContext.Provider>
        </UserContext.Provider>
      </Router>
    ));
  }

  beforeEach(async () => {
    fetchMock.restore();
    fetchMock.get('/api/topic', topicsFromApi);
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <title>Whats New</title>
      <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
      <subtitle>Confluence Syndication Feed</subtitle>
      <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
    fetchMock.get('/api/goal-templates?grantIds=2', [{
      id: 1,
      name: 'Goal Template 1',
    }]);
  });

  afterEach(() => {
    fetchMock.restore();
    jest.clearAllMocks();
  });

  it('you can select a nudged goal', async () => {
    const historySpy = jest.spyOn(history, 'push');
    fetchMock.get('/api/goals/recipient/1/region/1/nudge?name=This%20is%20goal%20text%2C%20long%20enough%20to%20trigger%20the%20nudge&grantNumbers=turtle-2', [{
      ids: [1, 2],
      isCurated: false,
      status: 'Not Started',
      name: 'A long goal name, it must be really long, most of them are',
    }]);
    renderForm();

    await screen.findByRole('heading', { name: 'Goal summary' });

    const combo = await screen.findByLabelText(/Recipient grant numbers/i);
    await selectEvent.select(combo, ['Turtle 2']);

    const goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });
    userEvent.type(goalText, 'This is goal text, long enough to trigger the nudge');
    jest.advanceTimersByTime(2000);

    expect(fetchMock.called('/api/goals/recipient/1/region/1/nudge?name=This%20is%20goal%20text%2C%20long%20enough%20to%20trigger%20the%20nudge&grantNumbers=turtle-2')).toBe(true);

    const radio = await screen.findByRole('radio', { name: /A long goal name, it must be really long, most of them are/i });
    act(() => {
      userEvent.click(radio);
    });

    const confirm = await screen.findByRole('button', { name: /Yes, edit/i });
    act(() => {
      userEvent.click(confirm);
    });

    // No, create a new goal

    await waitFor(() => {
      expect(historySpy).toHaveBeenCalledWith('/recipient-tta-records/1/region/1/goals?id[]=1,2');
    });
  });

  it('you can select a curated goal', async () => {
    const historySpy = jest.spyOn(history, 'push');
    fetchMock.get('/api/goals/recipient/1/region/1/nudge?name=This%20is%20goal%20text%2C%20long%20enough%20to%20trigger%20the%20nudge&grantNumbers=turtle-2', [{
      ids: [1, 2],
      isCurated: true,
      status: 'Not Started',
      name: 'A long goal name, it must be really long, most of them are',
    }]);
    renderForm();

    await screen.findByRole('heading', { name: 'Goal summary' });

    const combo = await screen.findByLabelText(/Recipient grant numbers/i);
    await selectEvent.select(combo, ['Turtle 2']);

    const goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });
    userEvent.type(goalText, 'This is goal text, long enough to trigger the nudge');
    jest.advanceTimersByTime(2000);

    expect(fetchMock.called('/api/goals/recipient/1/region/1/nudge?name=This%20is%20goal%20text%2C%20long%20enough%20to%20trigger%20the%20nudge&grantNumbers=turtle-2')).toBe(true);

    fetchMock.post('/api/goals', [{ goalIds: [1, 2] }]);

    const radio = await screen.findByRole('radio', { name: /A long goal name, it must be really long, most of them are/i });
    act(() => {
      userEvent.click(radio);
    });

    expect(fetchMock.called('/api/goals', { method: 'POST' })).toBe(true);
    await waitFor(() => {
      expect(historySpy).toHaveBeenCalledWith('/recipient-tta-records/1/region/1/goals?id[]=1,2');
    });
  });

  it('you can decline to select a nudged goal', async () => {
    const historySpy = jest.spyOn(history, 'push');
    fetchMock.get('/api/goals/recipient/1/region/1/nudge?name=This%20is%20goal%20text%2C%20long%20enough%20to%20trigger%20the%20nudge&grantNumbers=turtle-2', [{
      ids: [1, 2],
      isCurated: false,
      status: 'Not Started',
      name: 'A long goal name, it must be really long, most of them are',
    }]);
    renderForm();

    await screen.findByRole('heading', { name: 'Goal summary' });

    const combo = await screen.findByLabelText(/Recipient grant numbers/i);
    await selectEvent.select(combo, ['Turtle 2']);

    const goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });
    userEvent.type(goalText, 'This is goal text, long enough to trigger the nudge');
    jest.advanceTimersByTime(2000);

    expect(fetchMock.called('/api/goals/recipient/1/region/1/nudge?name=This%20is%20goal%20text%2C%20long%20enough%20to%20trigger%20the%20nudge&grantNumbers=turtle-2')).toBe(true);

    const radio = await screen.findByRole('radio', { name: /A long goal name, it must be really long, most of them are/i });
    act(() => {
      userEvent.click(radio);
    });

    const declinations = await screen.findAllByRole('button', { name: /No, create a new goal/i });
    const [, decline] = declinations;
    act(() => {
      userEvent.click(decline);
    });

    await waitFor(() => {
      expect(historySpy).not.toHaveBeenCalledWith('/recipient-tta-records/1/region/1/goals?id[]=1,2');
    });

    expect(fetchMock.called('/api/goals/changeStatus', { method: 'PUT' })).not.toBe(true);
  });

  it('an error selecting a nudged goal is handled', async () => {
    fetchMock.get('/api/goals/recipient/1/region/1/nudge?name=This%20is%20goal%20text%2C%20long%20enough%20to%20trigger%20the%20nudge&grantNumbers=turtle-2', [{
      ids: [1, 2],
      isCurated: true,
      status: 'Not Started',
      name: 'A long goal name, it must be really long, most of them are',
    }]);
    renderForm();

    await screen.findByRole('heading', { name: 'Goal summary' });

    const combo = await screen.findByLabelText(/Recipient grant numbers/i);
    await selectEvent.select(combo, ['Turtle 2']);

    const goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });
    userEvent.type(goalText, 'This is goal text, long enough to trigger the nudge');
    jest.advanceTimersByTime(2000);

    expect(fetchMock.called('/api/goals/recipient/1/region/1/nudge?name=This%20is%20goal%20text%2C%20long%20enough%20to%20trigger%20the%20nudge&grantNumbers=turtle-2')).toBe(true);

    fetchMock.post('/api/goals', 500);

    const radio = await screen.findByRole('radio', { name: /A long goal name, it must be really long, most of them are/i });
    act(() => {
      userEvent.click(radio);
    });

    jest.advanceTimersByTime(10000);

    expect(fetchMock.called('/api/goals', { method: 'POST' })).toBe(true);
    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('There was an error selecting your goal');
  });

  it('you can unsuspend a suspended goal', async () => {
    const historySpy = jest.spyOn(history, 'push');
    fetchMock.get('/api/goals/recipient/1/region/1/nudge?name=This%20is%20goal%20text%2C%20long%20enough%20to%20trigger%20the%20nudge&grantNumbers=turtle-2', [{
      ids: [1, 2],
      isCurated: false,
      status: 'Suspended',
      name: 'A long goal name, it must be really long, most of them are',
      closeSuspendReasons: ['Not enough time', 'Not enough money'],
    }]);
    renderForm();

    await screen.findByRole('heading', { name: 'Goal summary' });

    const combo = await screen.findByLabelText(/Recipient grant numbers/i);
    await selectEvent.select(combo, ['Turtle 2']);

    const goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });
    userEvent.type(goalText, 'This is goal text, long enough to trigger the nudge');
    jest.advanceTimersByTime(2000);

    expect(fetchMock.called('/api/goals/recipient/1/region/1/nudge?name=This%20is%20goal%20text%2C%20long%20enough%20to%20trigger%20the%20nudge&grantNumbers=turtle-2')).toBe(true);

    fetchMock.post('/api/goals', [{ goalIds: [1, 2] }]);

    const radio = await screen.findByRole('radio', { name: /A long goal name, it must be really long, most of them are/i });
    act(() => {
      userEvent.click(radio);
    });

    fetchMock.put('/api/goals/changeStatus', [{ id: 1 }, { id: 2 }]);

    const yesReopen = await screen.findByRole('button', { name: /Yes, reopen/i });
    act(() => {
      userEvent.click(yesReopen);
    });

    expect(fetchMock.called('/api/goals/changeStatus', { method: 'PUT' })).toBe(true);
    await waitFor(() => {
      expect(historySpy).toHaveBeenCalledWith('/recipient-tta-records/1/region/1/goals?id[]=1,2');
    });
  });

  it('handles an error at the unuspend endpoint', async () => {
    fetchMock.get('/api/goals/recipient/1/region/1/nudge?name=This%20is%20goal%20text%2C%20long%20enough%20to%20trigger%20the%20nudge&grantNumbers=turtle-2', [{
      ids: [1, 2],
      isCurated: false,
      status: 'Suspended',
      name: 'A long goal name, it must be really long, most of them are',
      closeSuspendReasons: ['Not enough time', 'Not enough money'],
    }]);
    renderForm();

    await screen.findByRole('heading', { name: 'Goal summary' });

    const combo = await screen.findByLabelText(/Recipient grant numbers/i);
    await selectEvent.select(combo, ['Turtle 2']);

    const goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });
    userEvent.type(goalText, 'This is goal text, long enough to trigger the nudge');
    jest.advanceTimersByTime(2000);

    expect(fetchMock.called('/api/goals/recipient/1/region/1/nudge?name=This%20is%20goal%20text%2C%20long%20enough%20to%20trigger%20the%20nudge&grantNumbers=turtle-2')).toBe(true);

    fetchMock.post('/api/goals', [{ goalIds: [1, 2] }]);

    const radio = await screen.findByRole('radio', { name: /A long goal name, it must be really long, most of them are/i });
    act(() => {
      userEvent.click(radio);
    });

    fetchMock.put('/api/goals/changeStatus', 500);

    const yesReopen = await screen.findByRole('button', { name: /Yes, reopen/i });
    act(() => {
      userEvent.click(yesReopen);
    });

    expect(fetchMock.called('/api/goals/changeStatus', { method: 'PUT' })).toBe(true);
  });

  it('you can decline to unsuspend a suspended goal', async () => {
    const historySpy = jest.spyOn(history, 'push');
    fetchMock.get('/api/goals/recipient/1/region/1/nudge?name=This%20is%20goal%20text%2C%20long%20enough%20to%20trigger%20the%20nudge&grantNumbers=turtle-2', [{
      ids: [1, 2],
      isCurated: false,
      status: 'Suspended',
      name: 'A long goal name, it must be really long, most of them are',
      closeSuspendReasons: ['Not enough time', 'Not enough money'],
    }]);
    renderForm();

    await screen.findByRole('heading', { name: 'Goal summary' });

    const combo = await screen.findByLabelText(/Recipient grant numbers/i);
    await selectEvent.select(combo, ['Turtle 2']);

    const goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });
    userEvent.type(goalText, 'This is goal text, long enough to trigger the nudge');
    jest.advanceTimersByTime(2000);

    expect(fetchMock.called('/api/goals/recipient/1/region/1/nudge?name=This%20is%20goal%20text%2C%20long%20enough%20to%20trigger%20the%20nudge&grantNumbers=turtle-2')).toBe(true);

    fetchMock.post('/api/goals', [{ goalIds: [1, 2] }]);

    const radio = await screen.findByRole('radio', { name: /A long goal name, it must be really long, most of them are/i });
    act(() => {
      userEvent.click(radio);
    });

    const declinations = await screen.findAllByRole('button', { name: /No, create a new goal/i });
    const [decline] = declinations;
    act(() => {
      userEvent.click(decline);
    });

    expect(fetchMock.called('/api/goals/changeStatus', { method: 'PUT' })).toBe(false);
    await waitFor(() => {
      expect(historySpy).not.toHaveBeenCalledWith('/recipient-tta-records/1/region/1/goals?id[]=1,2');
    });
  });
});
