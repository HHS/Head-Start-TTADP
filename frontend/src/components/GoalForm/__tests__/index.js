import '@testing-library/jest-dom';
import React from 'react';
import moment from 'moment';
import {
  render, screen, within,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';
import CreateGoal from '../index';
import { OBJECTIVE_ERROR_MESSAGES } from '../constants';
import { REPORT_STATUSES } from '../../../Constants';

const [
  objectiveTitleError, objectiveTopicsError, objectiveResourcesError,
] = OBJECTIVE_ERROR_MESSAGES;

const topicsFromApi = [
  'Behavioral / Mental Health / Trauma',
  'Child Assessment, Development, Screening',
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
      },
      {
        id: 2,
        numberWithProgramTypes: 'Turtle 2',
      },
    ],
  };

  const postResponse = [{
    id: 64175,
    goalName: 'This is goal text',
    status: 'Draft',
    endDate: '08/15/2023',
    isFromSmartsheetTtaPlan: false,
    timeframe: null,
    createdAt: '2022-03-09T19:20:45.818Z',
    updatedAt: '2022-03-09T19:20:45.818Z',
    grants: [
      {
        value: 1, label: 'Turtle 1', programs: [], id: 1,
      },
    ],
    recipientId: 1,
    regionId: 1,
    objectives: [{
      activityReports: [],
      title: 'test',
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
      id: 'new0',
    }],
  }];

  function renderForm(recipient = defaultRecipient, goalId = 'new') {
    const history = createMemoryHistory();
    render((
      <Router history={history}>
        <CreateGoal
          id={goalId}
          recipient={recipient}
          regionId="1"
        />
      </Router>
    ));
  }

  beforeEach(async () => {
    fetchMock.restore();
    fetchMock.get('/api/topic', topicsFromApi);
  });

  it('you can create a goal', async () => {
    renderForm();

    await screen.findByRole('heading', { name: 'Goal summary' });

    fetchMock.restore();
    fetchMock.post('/api/goals', postResponse);

    const saveDraft = await screen.findByRole('button', { name: /save draft/i });
    userEvent.click(saveDraft);

    const goalText = await screen.findByRole('textbox', { name: 'Recipient\'s goal *' });
    userEvent.type(goalText, 'This is goal text');

    const ed = await screen.findByRole('textbox', { name: /Estimated close date \(mm\/dd\/yyyy\) \*/i });
    userEvent.type(ed, '08/15/2023');

    const save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    // validate grant number
    await screen.findByText('Select at least one recipient grant number');

    const combo = await screen.findByLabelText(/Recipient grant numbers/i);
    await selectEvent.select(combo, ['Turtle 1']);

    const cancel = await screen.findByRole('link', { name: 'Cancel' });

    userEvent.click(save);

    expect(fetchMock.called()).toBeTruthy();

    // restore our fetch mock
    fetchMock.restore();
    expect(fetchMock.called()).toBe(false);
    fetchMock.post('/api/goals', postResponse);

    await screen.findByText(`Your goal was last saved at ${moment().format('MM/DD/YYYY [at] h:mm a')}`);

    expect(cancel).not.toBeVisible();

    const submit = await screen.findByRole('button', { name: /submit goal/i });
    userEvent.click(submit);
    expect(fetchMock.called()).toBeTruthy();
  });

  it('goals are validated', async () => {
    const recipient = {
      id: 2,
      grants: [
        {
          id: 2,
          numberWithProgramTypes: 'Turtle 2',
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
    expect(fetchMock.called()).toBe(true);

    // reset fetch mock state
    fetchMock.restore();
    fetchMock.post('/api/goals', postResponse);

    const save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    expect(fetchMock.called()).toBe(false);

    await screen.findByText(/Enter the recipient's goal/i);

    const goalText = await screen.findByRole('textbox', { name: 'Recipient\'s goal *' });
    userEvent.type(goalText, 'This is goal text');

    userEvent.click(save);
    await screen.findByText('Enter a valid date');

    const ed = await screen.findByRole('textbox', { name: /Estimated close date \(mm\/dd\/yyyy\) \*/i });
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
        },
      ],
    };
    renderForm(recipient);

    fetchMock.restore();
    fetchMock.post('/api/goals', 500);

    const goalText = await screen.findByRole('textbox', { name: 'Recipient\'s goal *' });
    userEvent.type(goalText, 'This is goal text');

    const ed = await screen.findByRole('textbox', { name: /Estimated close date \(mm\/dd\/yyyy\) \*/i });
    userEvent.type(ed, '08/15/2023');

    const save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    const draft = await screen.findByRole('button', { name: /save draft/i });
    userEvent.click(draft);

    let alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('There was an error saving your goal');

    fetchMock.restore();
    fetchMock.post('/api/goals', postResponse);
    userEvent.click(save);

    alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(`Your goal was last saved at ${moment().format('MM/DD/YYYY [at] h:mm a')}`);

    fetchMock.restore();
    fetchMock.post('/api/goals', 500);

    const submit = await screen.findByRole('button', { name: /submit goal/i });
    userEvent.click(submit);

    alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('There was an error saving your goal');
  });

  it('deletes goals', async () => {
    fetchMock.post('/api/goals', postResponse);

    const recipient = {
      id: 2,
      grants: [
        {
          id: 2,
          numberWithProgramTypes: 'Turtle 2',
        },
      ],
    };
    renderForm(recipient);

    await screen.findByRole('heading', { name: 'Goal summary' });

    const goalText = await screen.findByRole('textbox', { name: 'Recipient\'s goal *' });
    userEvent.type(goalText, 'This is goal text');

    const ed = await screen.findByRole('textbox', { name: /Estimated close date \(mm\/dd\/yyyy\) \*/i });
    userEvent.type(ed, '08/15/2023');

    const save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    await screen.findByText(`Your goal was last saved at ${moment().format('MM/DD/YYYY [at] h:mm a')}`);

    const goalActions = await screen.findByRole('button', { name: /actions for goal/i });
    userEvent.click(goalActions);

    fetchMock.restore();
    fetchMock.delete('/api/goals/64175', JSON.stringify(1));
    expect(fetchMock.called()).toBe(false);

    const deleteButton = within(await screen.findByTestId('menu')).getByRole('button', { name: /delete/i });
    userEvent.click(deleteButton);
    userEvent.tab();

    const modalDeleteButton = document.querySelector(':focus');
    expect(modalDeleteButton.textContent).toBe('Delete');

    userEvent.click(modalDeleteButton);
    await screen.findByRole('textbox', { name: 'Recipient\'s goal *' });
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
        },
      ],
    };
    renderForm(recipient);

    await screen.findByRole('heading', { name: 'Goal summary' });
    fetchMock.restore();
    fetchMock.post('/api/goals', postResponse);

    let goalText = await screen.findByRole('textbox', { name: 'Recipient\'s goal *' });
    userEvent.type(goalText, 'This is goal text');

    let ed = await screen.findByRole('textbox', { name: /Estimated close date \(mm\/dd\/yyyy\) \*/i });
    userEvent.type(ed, '08/15/2023');

    const cancel = await screen.findByRole('link', { name: 'Cancel' });
    let save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    expect(fetchMock.called()).toBeTruthy();

    // restore our fetch mock
    fetchMock.restore();
    expect(fetchMock.called()).toBe(false);
    fetchMock.post('/api/goals', postResponse);

    await screen.findByText(`Your goal was last saved at ${moment().format('MM/DD/YYYY [at] h:mm a')}`);
    expect(cancel).not.toBeVisible();

    const another = await screen.findByRole('button', { name: 'Add another goal' });
    userEvent.click(another);

    await screen.findByTestId('create-goal-form-cancel');

    goalText = await screen.findByRole('textbox', { name: 'Recipient\'s goal *' });
    userEvent.type(goalText, 'This is more goal text');

    ed = await screen.findByRole('textbox', { name: /Estimated close date \(mm\/dd\/yyyy\) \*/i });
    userEvent.type(ed, '08/15/2023');

    save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    fetchMock.delete('/api/goals/64175', JSON.stringify(1));

    const goalActions = await screen.findByRole('button', { name: /actions for goal/i });
    userEvent.click(goalActions);

    const deleteButton = within(await screen.findByTestId('menu')).getByRole('button', { name: /delete/i });
    userEvent.click(deleteButton);
    userEvent.tab();

    const modalDeleteButton = document.querySelector(':focus');
    expect(modalDeleteButton.textContent).toBe('Delete');

    userEvent.click(modalDeleteButton);
    await screen.findByRole('textbox', { name: 'Recipient\'s goal *' });
  });

  it('allows editing of goals', async () => {
    fetchMock.post('/api/goals', postResponse);

    const recipient = {
      id: 2,
      grants: [
        {
          id: 2,
          numberWithProgramTypes: 'Turtle 2',
        },
      ],
    };
    renderForm(recipient);

    await screen.findByRole('heading', { name: 'Goal summary' });

    let goalText = await screen.findByRole('textbox', { name: 'Recipient\'s goal *' });
    userEvent.type(goalText, 'This is goal text');

    const ed = await screen.findByRole('textbox', { name: /Estimated close date \(mm\/dd\/yyyy\) \*/i });
    userEvent.type(ed, '08/15/2023');

    const newObjective = await screen.findByRole('button', { name: 'Add new objective' });
    userEvent.click(newObjective);

    const objectiveText = await screen.findByRole('textbox', { name: /TTA objective \*/i });
    userEvent.type(objectiveText, 'test');

    const topics = await screen.findByLabelText(/topics \*/i);
    await selectEvent.select(topics, ['CLASS: Instructional Support']);

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

    goalText = await screen.findByRole('textbox', { name: 'Recipient\'s goal *' });

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
        },
      ],
    };

    renderForm(recipient);

    await screen.findByRole('heading', { name: 'Goal summary' });
    fetchMock.restore();
    fetchMock.post('/api/goals', postResponse);
    expect(fetchMock.called()).toBe(false);

    const goalText = await screen.findByRole('textbox', { name: 'Recipient\'s goal *' });
    userEvent.type(goalText, 'This is goal text');

    const ed = await screen.findByRole('textbox', { name: /Estimated close date \(mm\/dd\/yyyy\) \*/i });
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

    const topics = await screen.findByLabelText(/topics \*/i);
    await selectEvent.select(topics, ['Coaching']);

    userEvent.click(save);

    await screen.findByText(`Your goal was last saved at ${moment().format('MM/DD/YYYY [at] h:mm a')}`);

    expect(cancel).not.toBeVisible();

    const submit = await screen.findByRole('button', { name: /submit goal/i });
    userEvent.click(submit);
    expect(fetchMock.called()).toBe(true);
  });

  it('can add and validate objective resources', async () => {
    const recipient = {
      id: 2,
      grants: [
        {
          id: 2,
          numberWithProgramTypes: 'Turtle 2',
        },
      ],
    };

    renderForm(recipient);

    await screen.findByRole('heading', { name: 'Goal summary' });
    fetchMock.restore();
    fetchMock.post('/api/goals', postResponse);

    const goalText = await screen.findByRole('textbox', { name: 'Recipient\'s goal *' });
    userEvent.type(goalText, 'This is goal text');

    const ed = await screen.findByRole('textbox', { name: /Estimated close date \(mm\/dd\/yyyy\) \*/i });
    userEvent.type(ed, '08/15/2023');

    let newObjective = await screen.findByRole('button', { name: 'Add new objective' });
    userEvent.click(newObjective);

    const objectiveText = await screen.findByRole('textbox', { name: /TTA objective \*/i });
    userEvent.type(objectiveText, 'This is objective text');

    const topics = await screen.findByLabelText(/topics \*/i);
    await selectEvent.select(topics, ['Coaching']);

    const resourceOne = await screen.findByRole('textbox', { name: 'Resource 1' });
    userEvent.type(resourceOne, 'garrgeler');

    const save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    await screen.findByText(objectiveResourcesError);

    userEvent.clear(resourceOne);
    userEvent.type(resourceOne, 'https://search.marginalia.nu/');

    let addNewResource = await screen.findByRole('button', { name: 'Add new resource' });
    userEvent.click(addNewResource);

    const resourceTwo = await screen.findByRole('textbox', { name: 'Resource 2' });
    userEvent.type(resourceTwo, 'https://search.marginalia.nu/');

    addNewResource = await screen.findByRole('button', { name: 'Add new resource' });
    userEvent.click(addNewResource);

    userEvent.click(save);

    await screen.findByText(objectiveResourcesError);

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

  it('fetches and prepopulates goal data given an appropriate ID', async () => {
    fetchMock.get('/api/goals/12389/recipient/1', {
      goalName: 'This is a goal name',
      status: 'Not Started',
      endDate: '10/08/2021',
      objectives: [
        {
          id: 1238474,
          title: 'This is an objective',
          status: 'Not Started',
          resources: [],
          topics: [topicsFromApi[0]],
        },
      ],
    });

    renderForm(defaultRecipient, '12389');

    const goalName = await screen.findByText(/this is a goal name/i);
    const objectiveTitle = await screen.findByText(/This is an objective/i);

    expect(goalName).toBeVisible();
    expect(objectiveTitle).toBeVisible();

    const endDate = await screen.findByRole('textbox', { name: /Estimated close date/i });
    expect(endDate.value).toBe('10/08/2021');
  });

  it('draft goals don\'t show status dropdowns', async () => {
    fetchMock.get('/api/goals/12389/recipient/1', {
      goalName: 'This is a goal name',
      status: 'Draft',
      endDate: '10/08/2021',
      objectives: [
        {
          id: 1238474,
          title: 'This is an objective',
          status: 'Not Started',
          resources: [],
          topics: [topicsFromApi[0]],
        },
      ],
    });

    renderForm(defaultRecipient, '12389');

    const goalName = await screen.findByText(/this is a goal name/i);
    const objectiveTitle = await screen.findByText(/This is an objective/i);

    expect(goalName).toBeVisible();
    expect(objectiveTitle).toBeVisible();

    const endDate = await screen.findByRole('textbox', { name: /Estimated close date/i });
    expect(endDate.value).toBe('10/08/2021');
  });

  it('not started goals on AR', async () => {
    fetchMock.get('/api/goals/12389/recipient/1', {
      goalName: 'This is a goal name',
      status: 'Not Started',
      endDate: '10/08/2021',
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
    });

    renderForm(defaultRecipient, '12389');

    const goalName = await screen.findByText(/this is a goal name/i);
    const objectiveTitle = await screen.findByText(/This is an objective/i);

    expect(goalName).toBeVisible();
    expect(objectiveTitle).toBeVisible();

    // we should expect there to be a warning here
    await screen.findByText(/This goal is used on an activity report/i);
    await screen.findByText(/Some fields can't be edited/i);

    // only close date should be editable
    const endDate = await screen.findByRole('textbox', { name: /Estimated close date/i });
    expect(endDate.value).toBe('10/08/2021');
  });

  it('the correct fields are read only when the goal is in progress', async () => {
    fetchMock.get('/api/goals/12389/recipient/1', {
      goalName: 'This is a goal name',
      status: 'In Progress',
      endDate: '10/08/2021',
      objectives: [
        {
          id: 1238474,
          title: 'This is an objective',
          status: 'Not Started',
          resources: [],
          topics: [topicsFromApi[0]],
        },
      ],
    });

    renderForm(defaultRecipient, '12389');

    const goalName = await screen.findByText(/this is a goal name/i);
    const objectiveTitle = await screen.findByText(/This is an objective/i);

    expect(goalName).toBeVisible();
    expect(objectiveTitle).toBeVisible();

    const endDate = await screen.findByRole('textbox', { name: /Estimated close date/i });
    expect(endDate.value).toBe('10/08/2021');
  });
});
