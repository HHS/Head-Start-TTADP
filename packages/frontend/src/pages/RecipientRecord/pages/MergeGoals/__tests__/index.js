import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import join from 'url-join';
import { SCOPE_IDS } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';
import MergeGoals, { navigate } from '..';
import UserContext from '../../../../../UserContext';
import FilterContext from '../../../../../FilterContext';
import AppLoadingContext from '../../../../../AppLoadingContext';
import { mockWindowProperty } from '../../../../../testHelpers';

const memoryHistory = createMemoryHistory();

const RECIPIENT_ID = 401;
const REGION_ID = 1;
const GOAL_GROUP_ID = 1;

const urlBase = `/api/recipient/${RECIPIENT_ID}/region/${REGION_ID}/group/`;
const idToUrl = (id = GOAL_GROUP_ID) => `${urlBase}${id}`;

describe('Merge goals', () => {
  const setIsAppLoading = jest.fn();
  const goals = [{
    id: 4598,
    ids: [4598],
    goalStatus: 'In Progress',
    createdOn: '2021-06-15',
    goalText: 'This is goal text 1.',
    goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
    objectiveCount: 5,
    goalNumbers: ['G-4598'],
    reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
    objectives: [{
      title: 'whatever',
      endDate: '2021-06-15',
      reasons: [],
      topics: [],
      status: 'In Progress',
      grantNumbers: [],
      activityReports: [],
    }],
  },
  {
    id: 4600,
    ids: [4600, 4601],
    goalStatus: 'Not Started',
    createdOn: '2021-07-15',
    goalText: 'This is goal text 2.',
    goalTopics: ['Program Planning and Services'],
    objectiveCount: 1,
    goalNumbers: ['G-4600'],
    reasons: ['Monitoring | Deficiency'],
    objectives: [],
  },
  ];

  const recipient = {
    goals: [
      {
        id: 1,
        number: 'number',
      },
    ],
    grants: [],
  };

  const user = {
    name: 'test@test.com',
    homeRegionId: 1,
    permissions: [
      {
        scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
        regionId: 1,
      },
    ],
  };

  const adminUser = {
    name: 'admin@admin.com',
    homeRegionId: 1,
    permissions: [
      {
        scopeId: SCOPE_IDS.ADMIN,
        regionId: 1,
      },
    ],
  };

  const renderTest = (goalGroupId = GOAL_GROUP_ID, canMergeGoals = true, isAdmin = false) => {
    render(
      <Router history={memoryHistory}>
        <AppLoadingContext.Provider value={{ setIsAppLoading }}>
          <UserContext.Provider value={{ user: isAdmin ? adminUser : user }}>
            <FilterContext.Provider value={{ filterKey: 'test' }}>
              <MergeGoals
                recipientId={String(RECIPIENT_ID)}
                regionId={String(REGION_ID)}
                recipient={recipient}
                match={{
                  params: { recipientId: RECIPIENT_ID, regionId: REGION_ID, goalGroupId },
                  path: '',
                  url: '',
                }}
                recipientNameWithRegion="test"
                canMergeGoals={canMergeGoals}
              />
            </FilterContext.Provider>
          </UserContext.Provider>
        </AppLoadingContext.Provider>
      </Router>,
    );
  };

  mockWindowProperty('scrollTo', jest.fn());

  afterEach(() => {
    fetchMock.restore();
    jest.clearAllMocks();
  });

  it('renders and fetches', async () => {
    fetchMock.get(idToUrl(), { goalRows: goals });
    renderTest();
    await waitFor(() => expect(screen.getByText('Back to test')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('These goals might be duplicates')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('This is goal text 1.')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('This is goal text 2.')).toBeInTheDocument());
  });

  it('needs to be able to merge goals to proceed', async () => {
    fetchMock.get(idToUrl(), { goalRows: goals });
    act(() => renderTest(GOAL_GROUP_ID, false));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('You do not have permission to merge goals for this recipient')).toBeInTheDocument());
  });

  it('handles a fetch error', async () => {
    fetchMock.get(idToUrl(), 500);
    renderTest(GOAL_GROUP_ID);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Unable to fetch goals')).toBeInTheDocument());
  });

  it('you need to select two goals to proceed', async () => {
    fetchMock.get(idToUrl(), { goalRows: goals });
    renderTest();
    await waitFor(() => expect(screen.getByText('These goals might be duplicates')).toBeInTheDocument());
    const continueButton = await screen.findByRole('button', { name: 'Continue' });
    act(() => userEvent.click(continueButton));
    expect(await screen.findByText(/At least 2 goals must be selected/)).toBeInTheDocument();
  });

  it('selecting two goals allows you to proceed', async () => {
    fetchMock.get(idToUrl(), { goalRows: goals });
    renderTest();
    await waitFor(() => expect(screen.getByText('These goals might be duplicates')).toBeInTheDocument());

    const selectAll = await screen.findByLabelText('Select all');
    act(() => userEvent.click(selectAll));

    const continueButton = await screen.findByRole('button', { name: 'Continue' });
    act(() => userEvent.click(continueButton));

    const newPageHeadings = await screen.findAllByText(/Select goal to keep/i);
    expect(newPageHeadings.length).toBeTruthy();
  });

  it('toggle objective visibility', async () => {
    fetchMock.get(idToUrl(), { goalRows: goals });
    renderTest();
    await waitFor(() => expect(screen.getByText('These goals might be duplicates')).toBeInTheDocument());

    let firstCard = document.querySelector('.ttahub-goal-card__objective-list');
    expect(firstCard).not.toBeVisible();
    const [toggleButton] = await screen.findAllByRole('button', { name: /objectives for goal/i });
    act(() => {
      userEvent.click(toggleButton);
    });
    firstCard = document.querySelector('.ttahub-goal-card__objective-list');
    expect(firstCard).toBeVisible();
  });

  it('you need to pick a goal to keep', async () => {
    fetchMock.get(idToUrl(), { goalRows: goals });
    renderTest();
    await waitFor(() => expect(screen.getByText('These goals might be duplicates')).toBeInTheDocument());

    const selectAll = await screen.findByLabelText('Select all');
    act(() => userEvent.click(selectAll));

    let continueButton = await screen.findByRole('button', { name: 'Continue' });
    act(() => userEvent.click(continueButton));

    const newPageHeadings = await screen.findAllByText(/Select goal to keep/i);
    expect(newPageHeadings.length).toBeTruthy();

    continueButton = await screen.findByRole('button', { name: 'Continue' });
    act(() => userEvent.click(continueButton));

    expect(await screen.findByText(/One goal must be selected/)).toBeInTheDocument();
  });

  it('once you pick a goal to keep, you see a final goal', async () => {
    fetchMock.get(idToUrl(), { goalRows: goals });
    renderTest();
    await waitFor(() => expect(screen.getByText('These goals might be duplicates')).toBeInTheDocument());

    const selectAll = await screen.findByLabelText('Select all');
    act(() => userEvent.click(selectAll));

    let continueButton = await screen.findByRole('button', { name: 'Continue' });
    act(() => userEvent.click(continueButton));

    let newPageHeadings = await screen.findAllByText(/Select goal to keep/i);
    expect(newPageHeadings.length).toBeTruthy();

    const [radioButton] = await screen.findAllByRole('radio');
    userEvent.click(radioButton);

    continueButton = await screen.findByRole('button', { name: 'Continue' });
    act(() => userEvent.click(continueButton));

    newPageHeadings = await screen.findAllByText(/review merged goal/i);
    expect(newPageHeadings.length).toBeTruthy();

    const label = document.querySelector('.ttahub-final-goal--status .ttahub-final-goal--status-label');
    expect(label.textContent).toBe('In progress');
  });

  it('you can set none as duplicates', async () => {
    fetchMock.get(idToUrl(), { goalRows: goals });
    renderTest();
    await waitFor(() => expect(screen.getByText('These goals might be duplicates')).toBeInTheDocument());

    const markInvalidUrl = `/api/recipient/${RECIPIENT_ID}/region/${REGION_ID}/group/${GOAL_GROUP_ID}/invalid`;
    fetchMock.put(markInvalidUrl, 200);
    const noneAreDuplicates = await screen.findByRole('button', { name: 'None are duplicates' });

    act(() => {
      userEvent.click(noneAreDuplicates);
    });

    await waitFor(() => expect(fetchMock.called(markInvalidUrl, { method: 'PUT' })).toBeTruthy());
  });

  it('handles an error marking not duplicates', async () => {
    fetchMock.get(idToUrl(), { goalRows: goals });
    renderTest();
    await waitFor(() => expect(screen.getByText('These goals might be duplicates')).toBeInTheDocument());

    const markInvalidUrl = `/api/recipient/${RECIPIENT_ID}/region/${REGION_ID}/group/${GOAL_GROUP_ID}/invalid`;
    fetchMock.put(markInvalidUrl, 500);
    const noneAreDuplicates = await screen.findByRole('button', { name: 'None are duplicates' });

    act(() => {
      userEvent.click(noneAreDuplicates);
    });

    await waitFor(() => expect(fetchMock.called(markInvalidUrl, { method: 'PUT' })).toBeTruthy());
    expect(await screen.findByText('Unable to mark goals as not duplicates')).toBeInTheDocument();
  });

  it('you can go back', async () => {
    fetchMock.get(idToUrl(), { goalRows: goals });
    renderTest();
    await waitFor(() => expect(screen.getByText('These goals might be duplicates')).toBeInTheDocument());

    const selectAll = await screen.findByLabelText('Select all');
    act(() => userEvent.click(selectAll));

    let continueButton = await screen.findByRole('button', { name: 'Continue' });
    act(() => userEvent.click(continueButton));

    let newPageHeadings = await screen.findAllByText(/Select goal to keep/i);
    expect(newPageHeadings.length).toBeTruthy();

    const [radioButton] = await screen.findAllByRole('radio');
    userEvent.click(radioButton);

    continueButton = await screen.findByRole('button', { name: 'Continue' });
    act(() => userEvent.click(continueButton));

    newPageHeadings = await screen.findAllByText(/review merged goal/i);
    expect(newPageHeadings.length).toBeTruthy();

    const backButton = await screen.findByRole('button', { name: 'Back' });
    act(() => userEvent.click(backButton));

    newPageHeadings = await screen.findAllByText(/Select goal to keep/i);
    expect(newPageHeadings.length).toBeTruthy();
  });

  it('you can click the submit button', async () => {
    const oldPush = memoryHistory.push;
    memoryHistory.push = jest.fn();
    fetchMock.get(idToUrl(), { goalRows: goals });
    renderTest();
    await waitFor(() => expect(screen.getByText('These goals might be duplicates')).toBeInTheDocument());

    const selectAll = await screen.findByLabelText('Select all');
    act(() => userEvent.click(selectAll));

    let continueButton = await screen.findByRole('button', { name: 'Continue' });
    act(() => userEvent.click(continueButton));

    let newPageHeadings = await screen.findAllByText(/Select goal to keep/i);
    expect(newPageHeadings.length).toBeTruthy();

    const [radioButton] = await screen.findAllByRole('radio');
    userEvent.click(radioButton);

    continueButton = await screen.findByRole('button', { name: 'Continue' });
    act(() => userEvent.click(continueButton));

    newPageHeadings = await screen.findAllByText(/review merged goal/i);
    expect(newPageHeadings.length).toBeTruthy();

    const label = document.querySelector('.ttahub-final-goal--status .ttahub-final-goal--status-label');
    expect(label.textContent).toBe('In progress');

    const goalsUrl = join('api', 'goals', 'recipient', String(RECIPIENT_ID), 'region', String(REGION_ID), 'merge');
    fetchMock.post(goalsUrl, [{ id: 1 }, { id: 2 }]);

    const openModal = await screen.findByRole('button', { name: 'Merge goals' });
    act(() => userEvent.click(openModal));

    const confim = await screen.findByRole('button', { name: 'Yes, merge goals' });
    act(() => userEvent.click(confim));

    await waitFor(() => expect(fetchMock.called(goalsUrl, { method: 'POST' })).toBeTruthy());

    expect(memoryHistory.push).toHaveBeenCalledWith(
      `/recipient-tta-records/${RECIPIENT_ID}/region/${REGION_ID}/rttapa`,
      {
        mergedGoals: [1, 2],
      },
    );

    memoryHistory.push = oldPush;
  });

  it('handles submission errors', async () => {
    fetchMock.get(idToUrl(), { goalRows: goals });
    renderTest();
    await waitFor(() => expect(screen.getByText('These goals might be duplicates')).toBeInTheDocument());

    const selectAll = await screen.findByLabelText('Select all');
    act(() => userEvent.click(selectAll));

    let continueButton = await screen.findByRole('button', { name: 'Continue' });
    act(() => userEvent.click(continueButton));

    let newPageHeadings = await screen.findAllByText(/Select goal to keep/i);
    expect(newPageHeadings.length).toBeTruthy();

    const [radioButton] = await screen.findAllByRole('radio');
    userEvent.click(radioButton);

    continueButton = await screen.findByRole('button', { name: 'Continue' });
    act(() => userEvent.click(continueButton));

    newPageHeadings = await screen.findAllByText(/review merged goal/i);
    expect(newPageHeadings.length).toBeTruthy();

    const label = document.querySelector('.ttahub-final-goal--status .ttahub-final-goal--status-label');
    expect(label.textContent).toBe('In progress');

    const goalsUrl = join('api', 'goals', 'recipient', String(RECIPIENT_ID), 'region', String(REGION_ID), 'merge');
    fetchMock.post(goalsUrl, 500);

    const openModal = await screen.findByRole('button', { name: 'Merge goals' });
    act(() => userEvent.click(openModal));

    const confim = await screen.findByRole('button', { name: 'Yes, merge goals' });
    act(() => userEvent.click(confim));

    await waitFor(() => expect(fetchMock.called(goalsUrl, { method: 'POST' })).toBeTruthy());

    expect(await screen.findByText(/Unable to merge goals/)).toBeInTheDocument();
  });

  it('handles special baby curated goals', async () => {
    const gs = [
      goals[0],
      {
        ...goals[1],
        isCurated: true,
      },
    ];
    fetchMock.get(idToUrl(), { goalRows: gs });
    renderTest();
    await waitFor(() => expect(screen.getByText('These goals might be duplicates')).toBeInTheDocument());

    const selectAll = await screen.findByLabelText('Select all');
    act(() => userEvent.click(selectAll));

    let continueButton = await screen.findByRole('button', { name: 'Continue' });
    act(() => userEvent.click(continueButton));

    let newPageHeadings = await screen.findAllByText(/Select goal to keep/i);
    expect(newPageHeadings.length).toBeTruthy();

    expect(await screen.findByText(/If a goal uses text associated with an OHS initiative, it will automatically/i)).toBeInTheDocument();

    const radioButtons = await screen.findAllByRole('radio');
    expect(radioButtons.length).toBe(1);
    const [radioButton] = radioButtons;
    expect(radioButton).toBeChecked();

    continueButton = await screen.findByRole('button', { name: 'Continue' });
    act(() => userEvent.click(continueButton));

    newPageHeadings = await screen.findAllByText(/review merged goal/i);
    expect(newPageHeadings.length).toBeTruthy();

    const label = document.querySelector('.ttahub-final-goal--status .ttahub-final-goal--status-label');
    expect(label.textContent).toBe('In progress');

    const submitButton = await screen.findByRole('button', { name: 'Merge goals' });
    act(() => userEvent.click(submitButton));

    newPageHeadings = await screen.findAllByText(/review merged goal/i);
    expect(newPageHeadings.length).toBeTruthy();
  });

  it('can merge multiple curated goals', async () => {
    const gs = [
      {
        ...goals[0],
        goalStatus: 'Closed',
        isCurated: true,
      },
      {
        ...goals[1],
        goalStatus: 'In Progress',
        isCurated: true,
      },
    ];
    fetchMock.get(idToUrl(), { goalRows: gs });
    renderTest(GOAL_GROUP_ID, true, true);
    await waitFor(() => expect(screen.getByText('These goals might be duplicates')).toBeInTheDocument());

    const selectAll = await screen.findByLabelText('Select all');
    act(() => userEvent.click(selectAll));

    let continueButton = await screen.findByRole('button', { name: 'Continue' });
    act(() => userEvent.click(continueButton));

    let newPageHeadings = await screen.findAllByText(/Select goal to keep/i);
    expect(newPageHeadings.length).toBeTruthy();

    expect(await screen.findByText(/If a goal uses text associated with an OHS initiative, it will automatically/i)).toBeInTheDocument();

    const radioButtons = await screen.findAllByRole('radio');
    expect(radioButtons.length).toBe(2);
    const [, radioButton] = radioButtons;
    expect(radioButton).toBeChecked();

    radioButtons.forEach((rb) => expect(rb).toBeDisabled());

    continueButton = await screen.findByRole('button', { name: 'Continue' });
    act(() => userEvent.click(continueButton));

    newPageHeadings = await screen.findAllByText(/review merged goal/i);
    expect(newPageHeadings.length).toBeTruthy();

    const label = document.querySelector('.ttahub-final-goal--status .ttahub-final-goal--status-label');
    expect(label.textContent).toBe('In progress');

    const submitButton = await screen.findByRole('button', { name: 'Merge goals' });
    act(() => userEvent.click(submitButton));

    newPageHeadings = await screen.findAllByText(/review merged goal/i);
    expect(newPageHeadings.length).toBeTruthy();
  });
});

describe('navigate', () => {
  const scrollTo = jest.fn();
  mockWindowProperty('scrollTo', scrollTo);
  it('you cannot navigate to a page that doesn\'t exist', () => {
    navigate(10);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
