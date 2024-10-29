import '@testing-library/jest-dom';
import React from 'react';
import moment from 'moment';
import {
  render,
  screen,
  within,
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
import { OBJECTIVE_ERROR_MESSAGES } from '../constants';
import { BEFORE_OBJECTIVES_CREATE_GOAL, BEFORE_OBJECTIVES_SELECT_RECIPIENTS } from '../Form';
import AppLoadingContext from '../../../AppLoadingContext';

const [objectiveTitleError] = OBJECTIVE_ERROR_MESSAGES;

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

describe('create goal', () => {
  const history = createMemoryHistory();
  const defaultRecipient = {
    id: 1,
    grants: [
      {
        id: 1,
        numberWithProgramTypes: 'Turtle 1',
        status: 'Active',
      },
      {
        id: 2,
        numberWithProgramTypes: 'Turtle 2',
        status: 'Active',
      },
      {
        id: 2,
        numberWithProgramTypes: 'Turtle 3',
        status: 'Inactive',
      },
    ],
  };

  const GOAL_ID = 64175;

  const GOAL = {
    id: GOAL_ID,
    onApprovedAR: false,
    sources: [],
    prompts: [],
    name: 'This is goal text',
    status: 'Draft',
    endDate: '08/15/2023',
    goalTemplateId: 1,
    isFromSmartsheetTtaPlan: false,
    timeframe: null,
    isRttapa: 'No',
    createdAt: '2022-03-09T19:20:45.818Z',
    updatedAt: '2022-03-09T19:20:45.818Z',
    grants: [{
      value: 1, label: 'Turtle 1', programs: [], id: 1, status: 'Active',
    }],
    grantIds: [1],
    goalIds: [GOAL_ID],
    recipientId: 1,
    regionId: 1,
    objectives: [{
      ids: [1],
      activityReports: [],
      title: 'test',
      files: [],
      topics: [
        {
          value: 4,
          label: 'CLASS: Instructional Support',
        },
      ],
      status: 'Not Started',
      resources: [
        {
          key: '1d697eba-7c6a-44e9-b2cf-20841be8065e',
          value: 'https://search.marginalia.nu/',
        },
      ],
      supportType: 'Implementing',
      id: 1,
    }],
  };

  const postResponse = [GOAL];

  function renderForm(recipient = defaultRecipient) {
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
              goalIds={[64175]}
            />
          </AppLoadingContext.Provider>
        </UserContext.Provider>
      </Router>
    ));
  }

  beforeEach(async () => {
    fetchMock.restore();
    fetchMock.get('/api/topic', topicsFromApi);
    fetchMock.get('/api/feeds/item?tag=ttahub-tta-support-type', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title>Whats New</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <subtitle>Confluence Syndication Feed</subtitle>
    <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title>Whats New</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <subtitle>Confluence Syndication Feed</subtitle>
    <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
    fetchMock.get('/api/goals/recipient/2/region/1/nudge?name=This%20is%20goal%20text&grantNumbers=undefined', []);
    fetchMock.get('/api/goals/recipient/1/region/1/nudge?name=This%20is%20a%20goal%20name&grantNumbers=1', []);
    fetchMock.get('/api/goal-templates?grantIds=2', []);
  });

  it('you can add an objective', async () => {
    fetchMock.get(`/api/recipient/1/goals?goalIds=${GOAL_ID}`, [{
      name: 'This is a goal name',
      status: 'Draft',
      endDate: '',
      goalNumbers: ['G-12389'],
      prompts: [],
      grant: {
        id: 1,
        number: '1',
        programs: [{
          programType: 'EHS',
        }],
        status: 'Active',
      },
      objectives: [],
    }]);

    renderForm();

    await screen.findByRole('heading', { name: 'Goal summary' });

    fetchMock.restore();
    fetchMock.post('/api/goals', [
      {
        ...GOAL,
        objectives: [],
      },
    ]);
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title>Whats New</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <subtitle>Confluence Syndication Feed</subtitle>
    <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
    fetchMock.get('path:/nudge', []);
    fetchMock.get('/api/goal-templates?grantIds=2', []);

    await screen.findByText(/Recipient's goal/i);

    const save = await screen.findByRole('button', { name: /save and continue/i });

    const newObjective = await screen.findByRole('button', { name: 'Add new objective' });
    userEvent.click(newObjective);

    const objectiveText = await screen.findByRole('textbox', { name: /TTA objective \*/i });
    userEvent.type(objectiveText, 'test');

    userEvent.click(save);

    expect(fetchMock.called('/api/goals')).toBeTruthy();

    // restore our fetch mock
    fetchMock.restore();
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title>Whats New</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <subtitle>Confluence Syndication Feed</subtitle>
    <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
    fetchMock.post('/api/goals', postResponse);
    fetchMock.get('path:/nudge?', []);
    fetchMock.get('/api/goal-templates?grantIds=2', []);

    await screen.findByText(`Your goal was last saved at ${moment().format('MM/DD/YYYY [at] h:mm a')}`);

    const submit = await screen.findByRole('button', { name: /submit goal/i });
    userEvent.click(submit);
    expect(fetchMock.called('/api/goals', { method: 'POST' })).toBeTruthy();
    expect(fetchMock.lastOptions('/api/goals').body).toContain('ids');
    expect(fetchMock.called('/api/goals')).toBeTruthy();
  });

  it('goals are validated', async () => {
    const recipient = {
      id: 2,
      grants: [
        {
          id: 2,
          numberWithProgramTypes: 'Turtle 2',
          status: 'Active',
        },
      ],
    };
    fetchMock.post('/api/goals', postResponse);
    fetchMock.get('/api/recipient/2/goals?goalIds=64175', [{
      ...GOAL,
      endDate: '',
    }]);
    renderForm(recipient);

    await screen.findByRole('heading', { name: 'Goal summary' });

    const save = await screen.findByRole('button', { name: /save and continue/i });

    const ed = await screen.findByRole('textbox', { name: /anticipated close date \(mm\/dd\/yyyy\)/i });
    userEvent.type(ed, 'apple season');

    userEvent.click(save);

    await screen.findByText('Enter a valid date');

    userEvent.type(ed, '08/15/2023');

    expect(fetchMock.called('/api/goals', { method: 'post' })).toBe(false);

    userEvent.click(save);

    expect(fetchMock.called('/api/goals', { method: 'post' })).toBe(true);

    // restore our fetch mock
    fetchMock.restore();
    expect(fetchMock.called()).toBe(false);
    fetchMock.post('/api/goals', postResponse);

    const submit = await screen.findByRole('button', { name: /submit goal/i });
    userEvent.click(submit);
    expect(fetchMock.called()).toBeTruthy();
  });

  it('handles failures to save data', async () => {
    const recipient = {
      id: 2,
      grants: [
        {
          id: 2,
          numberWithProgramTypes: 'Turtle 2',
          status: 'Active',
        },
      ],
    };

    fetchMock.get('/api/recipient/2/goals?goalIds=64175', [{
      id: 1,
      name: 'This is a goal name',
      status: 'Not Started',
      endDate: '10/08/2021',
      prompts: [],
      goalNumbers: ['G-12389'],
      onApprovedAR: false,
      onAR: false,
      isCurated: false,
      goalTemplateId: 1,
      source: [],
      collaborators: [],
      isReopenedGoal: false,
      objectives: [],
      grants: [
        {
          id: 2,
          numberWithProgramTypes: 'Turtle 2',
          status: 'Active',
        },
      ],
    }]);

    act(() => {
      renderForm(recipient);
    });

    fetchMock.restore();
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <title>Whats New</title>
      <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
      <subtitle>Confluence Syndication Feed</subtitle>
      <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
    fetchMock.post('/api/goals', 500);
    fetchMock.get('/api/goals/recipient/2/region/1/nudge?name=This%20is%20goal%20text&grantNumbers=undefined', []);

    await screen.findByText(/Recipient's goal/i);

    const ed = await screen.findByRole('textbox', { name: /anticipated close date \(mm\/dd\/yyyy\)/i });
    userEvent.type(ed, '08/15/2023');

    const save = await screen.findByRole('button', { name: /save/i });
    userEvent.click(save);

    let alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('There was an error saving your goal');

    fetchMock.restore();
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title>Whats New</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <subtitle>Confluence Syndication Feed</subtitle>
    <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
    fetchMock.get('/api/goals/recipient/2/region/1/nudge?name=This%20is%20goal%20text&grantNumbers=undefined', []);
    fetchMock.post('/api/goals', postResponse);

    const newObjective = await screen.findByRole('button', { name: 'Add new objective' });
    userEvent.click(newObjective);

    const objectiveText = await screen.findByRole('textbox', { name: /TTA objective \*/i });
    userEvent.type(objectiveText, 'test');

    expect(fetchMock.called('/api/goals')).toBe(false);
    userEvent.click(save);

    expect(fetchMock.called('/api/goals')).toBeTruthy();
    alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(`Your goal was last saved at ${moment().format('MM/DD/YYYY [at] h:mm a')}`);

    fetchMock.restore();
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title>Whats New</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <subtitle>Confluence Syndication Feed</subtitle>
    <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
    fetchMock.get('/api/goals/recipient/2/region/1/nudge?name=This%20is%20goal%20text&grantNumbers=undefined', []);
    fetchMock.post('/api/goals', 500);

    const submit = await screen.findByRole('button', { name: /submit goal/i });
    userEvent.click(submit);

    alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('There was an error saving your goal');
  });

  it('correctly redirects when there is an error', async () => {
    const spy = jest.spyOn(history, 'push');
    fetchMock.restore();
    fetchMock.get('/api/recipient/1/goals?goalIds=64175', 500);
    await act(async () => {
      renderForm(defaultRecipient, '48743');
    });

    await waitFor(() => {
      expect(fetchMock.called('/api/recipient/1/goals?goalIds=64175')).toBeTruthy();
    });

    expect(spy).toHaveBeenCalledWith('/something-went-wrong/500');
  });

  it('removes goals', async () => {
    fetchMock.post('/api/goals', postResponse);
    fetchMock.get('/api/recipient/2/goals?goalIds=64175', postResponse);
    const recipient = {
      id: 2,
      grants: [
        {
          id: 2,
          numberWithProgramTypes: 'Turtle 2',
          status: 'Active',
        },
      ],
    };
    renderForm(recipient);

    await screen.findByRole('heading', { name: 'Goal summary' });
    await screen.findByText(/Recipient's goal/i);

    const save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    await screen.findByText(`Your goal was last saved at ${moment().format('MM/DD/YYYY [at] h:mm a')}`);

    const goalActions = await screen.findByRole('button', { name: /actions for goal/i });
    userEvent.click(goalActions);

    fetchMock.delete('/api/goals?goalIds=64175', JSON.stringify(1));
    expect(fetchMock.called('/api/goals?goalIds=64175', { method: 'delete' })).toBe(false);

    const deleteButton = within(await screen.findByTestId('menu')).getByRole('button', { name: /remove/i });
    userEvent.click(deleteButton);
    expect(fetchMock.called('/api/goals?goalIds=64175', { method: 'delete' })).toBe(true);
  });

  it('allows editing of goals', async () => {
    const recipient = {
      id: 2,
      grants: [
        {
          id: 2,
          numberWithProgramTypes: 'Turtle 2',
          status: 'Active',
        },
      ],
    };
    fetchMock.post('/api/goals', postResponse);
    fetchMock.get('/api/recipient/2/goals?goalIds=64175', postResponse);
    renderForm(recipient);

    await screen.findByRole('heading', { name: 'Goal summary' });

    await screen.findByText(/this is goal text/i);

    const ed = await screen.findByRole('textbox', { name: /anticipated close date \(mm\/dd\/yyyy\)/i });
    userEvent.type(ed, '08/15/2023');

    let save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    const goalActions = await screen.findByRole('button', { name: /actions for goal/i });
    userEvent.click(goalActions);

    const editButton = within(await screen.findByTestId('menu')).getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    fetchMock.restore();
    fetchMock.post('/api/goals', postResponse);
    fetchMock.get('/api/feeds/item?tag=ttahub-tta-support-type', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title>Whats New</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <subtitle>Confluence Syndication Feed</subtitle>
    <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title>Whats New</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <subtitle>Confluence Syndication Feed</subtitle>
    <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
    fetchMock.get('/api/goals/recipient/2/region/1/nudge?name=This%20is%20goal%20text%20and%20I%20want%20to%20meet%20my%20goals&grantNumbers=undefined', []);
    fetchMock.get('/api/goals/recipient/2/region/1/nudge?name=This%20is%20goal%20texts&grantNumbers=undefined', []);
    fetchMock.get('/api/goal-templates?grantIds=1', []);

    save = await screen.findByRole('button', { name: /save and continue/i });

    userEvent.click(save);

    expect(fetchMock.called('/api/goals', { method: 'POST' })).toBeTruthy();
    // Assert fetch mock contains the correct ids.
    const { body } = fetchMock.lastCall('/api/goals')[1];
    const parsed = JSON.parse(body);
    const [goal] = parsed.goals;

    // should be this:
    expect(goal.ids).toEqual([64175]);
  });

  it('can add and validate objectives', async () => {
    const recipient = {
      id: 2,
      grants: [
        {
          id: 2,
          numberWithProgramTypes: 'Turtle 2',
          status: 'Active',
        },
      ],
    };
    fetchMock.post('/api/goals', [
      {
        ...GOAL,
        objectives: [],
      },
    ]);
    fetchMock.get(`/api/recipient/2/goals?goalIds=${GOAL_ID}`, [
      {
        ...GOAL,
        objectives: [],
      },
    ]);

    renderForm(recipient);

    await screen.findByRole('heading', { name: 'Goal summary' });

    const cancel = await screen.findByRole('link', { name: 'Cancel' })
    const newObjective = await screen.findByRole('button', { name: 'Add new objective' });
    userEvent.click(newObjective);

    const save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    await screen.findByText(objectiveTitleError);

    const objectiveText = await screen.findByRole('textbox', { name: /TTA objective \*/i });
    userEvent.type(objectiveText, 'This is objective text');

    userEvent.click(save);

    await screen.findByText(`Your goal was last saved at ${moment().format('MM/DD/YYYY [at] h:mm a')}`);

    expect(cancel).not.toBeVisible();
  });

  it('fetches and prepopulates goal data given an appropriate ID', async () => {
    fetchMock.get(`/api/recipient/1/goals?goalIds=${GOAL_ID}`, [{
      name: 'This is a goal name',
      status: 'Not Started',
      endDate: '10/08/2021',
      goalNumbers: ['G-12389'],
      isRttapa: null,
      prompts: [],
      sources: [],
      grants: [{
        id: 1,
        number: '1',
        programs: [{
          programType: 'EHS',
        }],
        status: 'Active',
      }],
      objectives: [
        {
          id: 1238474,
          title: 'This is an objective',
          status: 'Not Started',
        },
      ],
    }]);

    renderForm(defaultRecipient, '12389');

    const goalName = await screen.findByText(/this is a goal name/i);
    const objectiveTitle = await screen.findByText(/This is an objective/i);

    expect(goalName).toBeVisible();
    expect(objectiveTitle).toBeVisible();

    const endDate = await screen.findByRole('textbox', { name: /anticipated close date/i });
    expect(endDate.value).toBe('10/08/2021');
  });

  it('draft goals don\'t show status dropdowns', async () => {
    fetchMock.get(`/api/recipient/1/goals?goalIds=${GOAL_ID}`, [{
      name: 'This is a goal name',
      status: 'Draft',
      endDate: '10/08/2021',
      goalNumbers: ['G-12389'],
      isRttapa: 'Yes',
      prompts: [],
      grant: {
        id: 1,
        number: '1',
        programs: [{
          programType: 'EHS',
        }],
        status: 'Active',
      },
      objectives: [
        {
          id: 1238474,
          title: 'This is an objective',
          status: 'Not Started',
        },
      ],
    }]);

    renderForm(defaultRecipient);

    const goalName = await screen.findByText(/this is a goal name/i);
    const objectiveTitle = await screen.findByText(/This is an objective/i);

    expect(goalName).toBeVisible();
    expect(objectiveTitle).toBeVisible();

    const endDate = await screen.findByRole('textbox', { name: /anticipated close date/i });
    expect(endDate.value).toBe('10/08/2021');
  });

  it('not started goals on AR', async () => {
    fetchMock.get(`/api/recipient/1/goals?goalIds=${GOAL_ID}`, [{
      name: 'This is a goal name',
      status: 'Not Started',
      endDate: '10/08/2021',
      goalNumbers: ['G-12389'],
      isRttapa: 'No',
      prompts: [],
      sources: [],
      onAR: true,
      onApprovedAR: false,
      grants: [{
        id: 1,
        number: '1',
        programs: [{
          programType: 'EHS',
        }],
        status: 'Active',
      }],
      objectives: [
        {
          id: 1238474,
          title: 'This is an objective',
          status: 'Not Started',
          onAR: true,
        },
      ],
    }]);

    renderForm(defaultRecipient);

    const goalName = await screen.findByText(/this is a goal name/i);
    const objectiveTitle = await screen.findByText(/This is an objective/i);

    expect(goalName).toBeVisible();
    expect(objectiveTitle).toBeVisible();

    // we should expect there to be a warning here
    await screen.findByText(/This goal is used on an activity report/i);
    await screen.findByText(/Some fields can't be edited/i);

    // only close date should be editable
    const endDate = await screen.findByRole('textbox', { name: /anticipated close date/i });
    expect(endDate.value).toBe('10/08/2021');
  });
});
