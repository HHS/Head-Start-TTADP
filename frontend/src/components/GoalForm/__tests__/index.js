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
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title>Whats New</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <subtitle>Confluence Syndication Feed</subtitle>
    <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
    fetchMock.get('/api/goals/recipient/2/region/1/nudge?name=This%20is%20goal%20text&grantNumbers=undefined', []);
    fetchMock.get('/api/goals/recipient/1/region/1/nudge?name=This%20is%20a%20goal%20name&grantNumbers=1', []);
    fetchMock.get('/api/goal-templates?grantIds=2', []);
  });

  it('you cannot add objectives before filling in basic goal info', async () => {
    renderForm();
    const addObjectiveButton = await screen.findByRole('button', { name: 'Add new objective' });
    userEvent.click(addObjectiveButton);
    await screen.findByText(BEFORE_OBJECTIVES_CREATE_GOAL);
    await screen.findByText(BEFORE_OBJECTIVES_SELECT_RECIPIENTS);

    const goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });
    userEvent.type(goalText, 'This is goal text');
    userEvent.click(addObjectiveButton);

    await screen.findByText(BEFORE_OBJECTIVES_SELECT_RECIPIENTS);
    await waitFor(() => expect(screen.queryByText(BEFORE_OBJECTIVES_CREATE_GOAL)).toBeNull());

    const combo = await screen.findByLabelText(/Recipient grant numbers/i);
    await selectEvent.select(combo, ['Turtle 1']);
    userEvent.click(addObjectiveButton);

    await screen.findByRole('heading', { name: 'Objective summary' });
  });

  it('you can create a goal', async () => {
    renderForm();

    await screen.findByRole('heading', { name: 'Goal summary' });

    fetchMock.restore();
    fetchMock.post('/api/goals', postResponse);
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title>Whats New</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <subtitle>Confluence Syndication Feed</subtitle>
    <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
    fetchMock.get('path:/nudge', []);
    fetchMock.get('/api/goal-templates?grantIds=2', []);

    const saveDraft = await screen.findByRole('button', { name: /save draft/i });
    userEvent.click(saveDraft);

    const goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });
    userEvent.type(goalText, 'This is goal text');

    const ed = await screen.findByRole('textbox', { name: /anticipated close date \(mm\/dd\/yyyy\)/i });
    userEvent.type(ed, '08/15/2023');

    const save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    // validate grant number
    await screen.findByText('Select at least one recipient grant number');

    const combo = await screen.findByLabelText(/Recipient grant numbers/i);
    await selectEvent.select(combo, ['Turtle 2']);

    const newObjective = await screen.findByRole('button', { name: 'Add new objective' });
    userEvent.click(newObjective);

    const objectiveText = await screen.findByRole('textbox', { name: /TTA objective \*/i });
    userEvent.type(objectiveText, 'test');

    const topics = await screen.findByLabelText(/topics \*/i, { selector: '#topics' });
    await selectEvent.select(topics, ['CLASS: Instructional Support']);

    const resourceOne = document.querySelector('#resource-1');
    userEvent.type(resourceOne, 'https://search.marginalia.nu/');

    const supportType = await screen.findByRole('combobox', { name: /support type/i });
    act(() => {
      userEvent.selectOptions(supportType, 'Implementing');
    });

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

    renderForm(recipient);

    await screen.findByRole('heading', { name: 'Goal summary' });
    fetchMock.restore();
    fetchMock.post('/api/goals', postResponse);

    // saving drafts works
    const saveDraft = await screen.findByRole('button', { name: /save draft/i });
    userEvent.click(saveDraft);
    expect(fetchMock.called()).toBe(false);

    // reset fetch mock state
    fetchMock.restore();
    fetchMock.post('/api/goals', postResponse);

    const save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    expect(fetchMock.called()).toBe(false);

    await screen.findByText(/Enter the recipient's goal/i);

    const goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });
    userEvent.type(goalText, 'This is goal text');

    const ed = await screen.findByRole('textbox', { name: /anticipated close date \(mm\/dd\/yyyy\)/i });
    userEvent.type(ed, 'apple season');

    userEvent.click(save);

    await screen.findByText('Enter a valid date');

    userEvent.type(ed, '08/15/2023');

    expect(fetchMock.called()).toBe(false);

    userEvent.click(save);

    expect(fetchMock.called()).toBeTruthy();

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
    renderForm(recipient);

    fetchMock.restore();
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title>Whats New</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <subtitle>Confluence Syndication Feed</subtitle>
    <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
    fetchMock.post('/api/goals', 500);
    fetchMock.get('/api/goals/recipient/2/region/1/nudge?name=This%20is%20goal%20text&grantNumbers=undefined', []);

    const goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });
    userEvent.type(goalText, 'This is goal text');

    const ed = await screen.findByRole('textbox', { name: /anticipated close date \(mm\/dd\/yyyy\)/i });
    userEvent.type(ed, '08/15/2023');

    const save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    const draft = await screen.findByRole('button', { name: /save draft/i });
    userEvent.click(draft);
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

    const topics = await screen.findByLabelText(/topics \*/i, { selector: '#topics' });
    await selectEvent.select(topics, ['CLASS: Instructional Support']);

    const resourceOne = await screen.findByRole('textbox', { name: 'Resource 1' });
    userEvent.type(resourceOne, 'https://search.marginalia.nu/');

    const supportType = await screen.findByRole('combobox', { name: /support type/i });
    act(() => {
      userEvent.selectOptions(supportType, 'Implementing');
    });

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

  it('removes goals', async () => {
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

    const goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });
    userEvent.type(goalText, 'This is goal text');

    const ed = await screen.findByRole('textbox', { name: /anticipated close date \(mm\/dd\/yyyy\)/i });
    userEvent.type(ed, '08/15/2023');

    const newObjective = await screen.findByRole('button', { name: 'Add new objective' });
    userEvent.click(newObjective);

    const objectiveText = await screen.findByRole('textbox', { name: /TTA objective \*/i });
    userEvent.type(objectiveText, 'test');

    const topicsText = screen.queryAllByLabelText(/topics \*/i);
    expect(topicsText.length).toBe(1);
    const topics = document.querySelector('#topics');

    await selectEvent.select(topics, ['CLASS: Instructional Support']);

    const resourceOne = await screen.findByRole('textbox', { name: 'Resource 1' });
    userEvent.type(resourceOne, 'https://search.marginalia.nu/');

    const supportType = await screen.findByRole('combobox', { name: /support type/i });
    act(() => {
      userEvent.selectOptions(supportType, 'Implementing');
    });

    const save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    await screen.findByText(`Your goal was last saved at ${moment().format('MM/DD/YYYY [at] h:mm a')}`);

    const goalActions = await screen.findByRole('button', { name: /actions for goal/i });
    userEvent.click(goalActions);

    fetchMock.restore();
    fetchMock.delete('/api/goals?goalIds=64175', JSON.stringify(1));
    expect(fetchMock.called()).toBe(false);

    const deleteButton = within(await screen.findByTestId('menu')).getByRole('button', { name: /remove/i });
    userEvent.click(deleteButton);
    await screen.findByRole('textbox', { name: /Recipient's goal/i });
    expect(fetchMock.called()).toBeTruthy();
  });

  it('create more than one goal', async () => {
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
    fetchMock.restore();
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title>Whats New</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <subtitle>Confluence Syndication Feed</subtitle>
    <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
    fetchMock.post('/api/goals', postResponse);
    fetchMock.get('/api/goals/recipient/2/region/1/nudge?name=This%20is%20goal%20text&grantNumbers=undefined', []);
    fetchMock.get('/api/goals/recipient/2/region/1/nudge?name=This%20is%20more%20goal%20text&grantNumbers=undefined', []);

    let goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });
    userEvent.type(goalText, 'This is goal text');

    let ed = await screen.findByRole('textbox', { name: /anticipated close date \(mm\/dd\/yyyy\)/i });
    userEvent.type(ed, '08/15/2023');

    let newObjective = await screen.findByRole('button', { name: 'Add new objective' });
    userEvent.click(newObjective);

    let objectiveText = await screen.findByRole('textbox', { name: /TTA objective \*/i });
    userEvent.type(objectiveText, 'test');

    const topicsText = screen.queryAllByLabelText(/topics \*/i);
    expect(topicsText.length).toBe(1);
    let topics = document.querySelector('#topics');

    await selectEvent.select(topics, ['CLASS: Instructional Support']);

    let supportType = await screen.findByRole('combobox', { name: /support type/i });
    act(() => {
      userEvent.selectOptions(supportType, 'Implementing');
    });

    let resourceOne = await screen.findByRole('textbox', { name: 'Resource 1' });
    userEvent.type(resourceOne, 'https://search.marginalia.nu/');

    const cancel = await screen.findByRole('link', { name: 'Cancel' });
    let save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    expect(fetchMock.called('/api/goals', { method: 'POST' })).toBeTruthy();
    expect(fetchMock.lastCall('/api/goals')[1].body).toContain('ids');

    // restore our fetch mock
    fetchMock.restore();
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <title>Whats New</title>
  <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
  <subtitle>Confluence Syndication Feed</subtitle>
  <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
    fetchMock.post('/api/goals', postResponse);
    fetchMock.get('/api/goals/recipient/2/region/1/nudge?name=This%20is%20goal%20text&grantNumbers=undefined', []);
    fetchMock.get('/api/goals/recipient/2/region/1/nudge?name=This%20is%20more%20goal%20text&grantNumbers=undefined', []);
    expect(fetchMock.called('/api/goals')).toBe(false);

    await screen.findByText(`Your goal was last saved at ${moment().format('MM/DD/YYYY [at] h:mm a')}`);
    expect(cancel).not.toBeVisible();

    const another = await screen.findByRole('button', { name: 'Add another goal' });
    userEvent.click(another);

    await screen.findByTestId('create-goal-form-cancel');

    goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });
    userEvent.type(goalText, 'This is more goal text');

    ed = await screen.findByRole('textbox', { name: /anticipated close date \(mm\/dd\/yyyy\)/i });
    userEvent.type(ed, '08/15/2023');

    newObjective = await screen.findByRole('button', { name: 'Add new objective' });
    userEvent.click(newObjective);

    objectiveText = await screen.findByRole('textbox', { name: /TTA objective \*/i });
    userEvent.type(objectiveText, 'test');

    topics = document.querySelector('#topics');
    await selectEvent.select(topics, ['CLASS: Instructional Support']);

    supportType = await screen.findByRole('combobox', { name: /support type/i });
    act(() => {
      userEvent.selectOptions(supportType, 'Implementing');
    });

    resourceOne = await screen.findByRole('textbox', { name: 'Resource 1' });
    userEvent.type(resourceOne, 'https://search.marginalia.nu/');

    userEvent.click((await screen.findByRole('button', { name: /save draft/i })));

    save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    fetchMock.delete('/api/goals?goalIds=64175', JSON.stringify(1));

    const goalActions = await screen.findByRole('button', { name: /actions for goal/i });
    userEvent.click(goalActions);

    const deleteButton = within(await screen.findByTestId('menu')).getByRole('button', { name: /remove/i });
    userEvent.click(deleteButton);
    await screen.findByRole('textbox', { name: /Recipient's goal/i });
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

    const save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    const goalActions = await screen.findByRole('button', { name: /actions for goal/i });
    userEvent.click(goalActions);

    expect(goalText).not.toBeVisible();
    expect(goalText.value).toBe('');

    const editButton = within(await screen.findByTestId('menu')).getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });

    expect(goalText.value).toBe('This is goal text');
    userEvent.type(goalText, ' and I want to meet my goals');
    userEvent.click(save);
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

    renderForm(recipient);

    await screen.findByRole('heading', { name: 'Goal summary' });
    fetchMock.restore();
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <title>Whats New</title>
  <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
  <subtitle>Confluence Syndication Feed</subtitle>
  <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
    fetchMock.get('/api/goals/recipient/2/region/1/nudge?name=This%20is%20goal%20text&grantNumbers=undefined', []);
    fetchMock.post('/api/goals', postResponse);
    expect(fetchMock.called('/api/goals')).toBe(false);

    const goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });
    userEvent.type(goalText, 'This is goal text');

    const ed = await screen.findByRole('textbox', { name: /anticipated close date \(mm\/dd\/yyyy\)/i });
    userEvent.type(ed, '08/15/2023');

    const cancel = await screen.findByRole('link', { name: 'Cancel' });

    const newObjective = await screen.findByRole('button', { name: 'Add new objective' });
    userEvent.click(newObjective);

    const save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    await screen.findByText(objectiveTitleError);

    const objectiveText = await screen.findByRole('textbox', { name: /TTA objective \*/i });
    userEvent.type(objectiveText, 'This is objective text');

    userEvent.click(save);

    await screen.findByText(objectiveTopicsError);

    const topics = await screen.findByLabelText(/topics \*/i, { selector: '#topics' });
    await selectEvent.select(topics, ['Coaching']);

    const supportType = await screen.findByRole('combobox', { name: /support type/i });
    act(() => {
      userEvent.selectOptions(supportType, 'Implementing');
    });

    userEvent.click(save);

    await screen.findByText(`Your goal was last saved at ${moment().format('MM/DD/YYYY [at] h:mm a')}`);

    expect(cancel).not.toBeVisible();

    const submit = await screen.findByRole('button', { name: /submit goal/i });
    userEvent.click(submit);
    expect(fetchMock.called('/api/goals')).toBe(true);
  });

  it('can add and validate objective resources', async () => {
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
    fetchMock.restore();
    fetchMock.post('/api/goals', postResponse);
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title>Whats New</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <subtitle>Confluence Syndication Feed</subtitle>
    <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
    fetchMock.get('/api/goals/recipient/2/region/1/nudge?name=This%20is%20goal%20text&grantNumbers=undefined', []);

    const goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });
    userEvent.type(goalText, 'This is goal text');

    const ed = await screen.findByRole('textbox', { name: /anticipated close date \(mm\/dd\/yyyy\)/i });
    userEvent.type(ed, '08/15/2023');

    let newObjective = await screen.findByRole('button', { name: 'Add new objective' });
    userEvent.click(newObjective);

    const objectiveText = await screen.findByRole('textbox', { name: /TTA objective \*/i });
    userEvent.type(objectiveText, 'This is objective text');

    const topics = await screen.findByLabelText(/topics \*/i, { selector: '#topics' });
    await selectEvent.select(topics, ['Coaching']);

    const supportType = await screen.findByRole('combobox', { name: /support type/i });
    act(() => {
      userEvent.selectOptions(supportType, 'Implementing');
    });

    const resourceOne = await screen.findByRole('textbox', { name: 'Resource 1' });
    userEvent.type(resourceOne, 'garrgeler');

    const save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    await screen.findByText('Enter one resource per field. Valid resource links must start with http:// or https://');

    userEvent.clear(resourceOne);
    userEvent.type(resourceOne, 'https://search.marginalia.nu/');

    let addNewResource = await screen.findByRole('button', { name: 'Add new resource' });
    userEvent.click(addNewResource);

    const resourceTwo = await screen.findByRole('textbox', { name: 'Resource 2' });
    userEvent.type(resourceTwo, 'https://search.marginalia.nu/https://search.marginalia.nu/https://search.marginalia.nu/');

    const saveDraft = await screen.findByRole('button', { name: /save draft/i });
    userEvent.click(saveDraft);

    await screen.findByText('Enter one resource per field. Valid resource links must start with http:// or https://');

    userEvent.clear(resourceTwo);
    userEvent.type(resourceTwo, 'https://search.marginalia.nu/');

    addNewResource = await screen.findByRole('button', { name: 'Add new resource' });
    userEvent.click(addNewResource);

    const resourceThree = await screen.findByRole('textbox', { name: 'Resource 3' });
    userEvent.type(resourceThree, 'NOT A LINK NOT A LINK HAHAHAHA');

    userEvent.click(save);

    await screen.findByText('Enter one resource per field. Valid resource links must start with http:// or https://');

    addNewResource = await screen.findByRole('button', { name: 'Add new resource' });
    userEvent.click(addNewResource);

    const removeResource = await screen.findByRole('button', { name: /remove resource 3/i });
    userEvent.click(removeResource);

    newObjective = await screen.findByRole('button', { name: 'Add new objective' });
    userEvent.click(newObjective);

    const removeObjective = await screen.findByRole('button', { name: 'Remove objective 2' });
    userEvent.click(removeObjective);

    userEvent.click(save);

    await screen.findByText(`Your goal was last saved at ${moment().format('MM/DD/YYYY [at] h:mm a')}`);

    const submit = await screen.findByRole('button', { name: /submit goal/i });
    userEvent.click(submit);
    expect(fetchMock.called()).toBe(true);
  });

  it('can add objective files', async () => {
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
    fetchMock.restore();
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title>Whats New</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <subtitle>Confluence Syndication Feed</subtitle>
    <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
    fetchMock.post('/api/goals', postResponse);
    fetchMock.get('/api/goals/recipient/2/region/1/nudge?name=This%20is%20goal%20text&grantNumbers=undefined', []);

    const goalText = await screen.findByRole('textbox', { name: /Recipient's goal/i });
    userEvent.type(goalText, 'This is goal text');

    const ed = await screen.findByRole('textbox', { name: /anticipated close date \(mm\/dd\/yyyy\)/i });
    userEvent.type(ed, '08/15/2023');

    const newObjective = await screen.findByRole('button', { name: 'Add new objective' });
    userEvent.click(newObjective);

    expect(document.querySelectorAll('ttahub-objective-files').length).toBe(0);

    const objectiveText = await screen.findByRole('textbox', { name: /TTA objective \*/i });
    userEvent.type(objectiveText, 'This is objective text');

    const saveDraft = await screen.findByRole('button', { name: /save draft/i });
    await waitFor(() => userEvent.click(saveDraft));

    const fieldset = document.querySelector('.ttahub-objective-files');

    const yes = await within(fieldset).findByRole('radio', { name: 'Yes' });
    const no = await within(fieldset).findByRole('radio', { name: 'No' });

    expect(no.checked).toBe(true);
    act(() => userEvent.click(yes));
    expect(yes.checked).toBe(true);

    await screen.findByText('Attach any non-link resources');

    const dispatchEvt = (node, type, data) => {
      const event = new Event(type, { bubbles: true });
      Object.assign(event, data);
      fireEvent(node, event);
    };

    const mockData = (files) => ({
      dataTransfer: {
        files,
        items: files.map((file) => ({
          kind: 'file',
          type: file.type,
          getAsFile: () => file,
        })),
        types: ['Files'],
      },
    });

    const file = (name, id, status = 'Uploaded') => ({
      originalFileName: name, id, fileSize: 2000, status, lastModified: 123456,
    });

    const data = mockData([file('file.csv', 1)]);

    const dropzone = await screen.findByRole('button', { name: 'Select and upload' });
    act(() => dispatchEvt(dropzone, 'drop', data));
    await waitFor(() => fetchMock.called('/api/files/objectives'));
  });

  it('fetches and prepopulates goal data given an appropriate ID', async () => {
    fetchMock.get('/api/recipient/1/goals?goalIds=', [{
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
          resources: [],
          topics: [topicsFromApi[0]],
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

  it('objective can be suspended', async () => {
    fetchMock.get('/api/recipient/1/goals?goalIds=', [{
      name: 'This is a goal name',
      status: 'In Progress',
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
          resources: [],
          topics: [topicsFromApi[0]],
        },
      ],
    }]);

    renderForm(defaultRecipient, '12389');
    const objectiveStatus = await screen.findByRole('combobox', { name: /objective status/i });

    userEvent.selectOptions(objectiveStatus, 'Suspended');
    const recipientRequestReason = await screen.findByLabelText(/Recipient request/i);
    userEvent.click(recipientRequestReason);

    const context = await screen.findByLabelText(/Additional context/i);
    userEvent.type(context, 'This is the context');

    userEvent.click(await screen.findByText(/Submit/i));

    expect(await screen.findByLabelText(/objective status/i)).toBeVisible();
    expect(await screen.findByText(/reason suspended/i)).toBeVisible();
    expect(await screen.findByText(/recipient request - this is the context/i)).toBeVisible();
  });

  it('draft goals don\'t show status dropdowns', async () => {
    fetchMock.get('/api/recipient/1/goals?goalIds=', [{
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
          resources: [],
          topics: [topicsFromApi[0]],
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

  it('not started goals on AR', async () => {
    fetchMock.get('/api/recipient/1/goals?goalIds=', [{
      name: 'This is a goal name',
      status: 'Not Started',
      endDate: '10/08/2021',
      goalNumbers: ['G-12389'],
      isRttapa: 'No',
      prompts: [],
      sources: [],
      onAnyReport: true,
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
          resources: [],
          topics: [topicsFromApi[0]],
          activityReports: [
            {
              status: REPORT_STATUSES.SUBMITTED,
            },
          ],
        },
      ],
    }]);

    renderForm(defaultRecipient, '12389');

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

  it('the correct fields are read only when the goal is in progress', async () => {
    fetchMock.get('/api/recipient/1/goals?goalIds=', [{
      name: 'This is a goal name',
      status: 'In Progress',
      endDate: '10/08/2021',
      goalNumbers: ['G-12389'],
      isRttapa: 'Yes',
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
          resources: [],
          topics: [topicsFromApi[0]],
          activityReports: [],
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
});
