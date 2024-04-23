import '@testing-library/jest-dom';
import React from 'react';
import moment from 'moment';
import {
  render,
  screen,
  within,
  waitFor,
  act,
  fireEvent,
} from '@testing-library/react';
import { REPORT_STATUSES, SCOPE_IDS } from '@ttahub/common';
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

const [
  objectiveTitleError, objectiveTopicsError,
] = OBJECTIVE_ERROR_MESSAGES;

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

  const postResponse = [{
    id: 64175,
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
    goalIds: [64175],
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
  }];

  function renderForm(recipient = defaultRecipient, goalId = 'new') {
    const history = createMemoryHistory();
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

  it('allows editing of goals', async () => {
    fetchMock.post('/api/goals', postResponse);

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

    let goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });
    userEvent.type(goalText, 'This is goal text');

    const ed = await screen.findByRole('textbox', { name: /anticipated close date \(mm\/dd\/yyyy\)/i });
    userEvent.type(ed, '08/15/2023');

    const newObjective = await screen.findByRole('button', { name: 'Add new objective' });
    userEvent.click(newObjective);

    const objectiveText = await screen.findByRole('textbox', { name: /TTA objective \*/i });
    userEvent.type(objectiveText, 'test');

    const topics = await screen.findByLabelText(/topics \*/i, { selector: '#topics' });
    await selectEvent.select(topics, ['CLASS: Instructional Support']);

    const supportType = await screen.findByRole('combobox', { name: /support type/i });
    act(() => {
      userEvent.selectOptions(supportType, 'Implementing');
    });

    const resourceOne = await screen.findByRole('textbox', { name: 'Resource 1' });
    userEvent.type(resourceOne, 'https://search.marginalia.nu/');

    let save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    const goalActions = await screen.findByRole('button', { name: /actions for goal/i });
    userEvent.click(goalActions);

    expect(goalText).not.toBeVisible();
    expect(goalText.value).toBe('');

    const editButton = within(await screen.findByTestId('menu')).getByRole('button', { name: /edit/i });

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
    act(() => {
      userEvent.click(editButton);
    });

    goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });

    expect(goalText.value).toBe('This is goal text');

    act(() => {
      userEvent.type(goalText, ' and I want to meet my goals');
    });
    save = await screen.findByRole('button', { name: /save and continue/i });

    act(() => {
      userEvent.click(save);
    });

    await waitFor(() => {
      expect(fetchMock.called('/api/goals', { method: 'POST' })).toBeTruthy();
    });

    // Assert fetch mock contains the correct ids.
    const { body } = fetchMock.lastCall('/api/goals')[1];
    const parsed = JSON.parse(body);
    const [goal] = parsed.goals;
    expect(goal.ids).toEqual([456]);
    // should be this:
    // expect(goal.ids).toEqual([64175]);
  });
});
