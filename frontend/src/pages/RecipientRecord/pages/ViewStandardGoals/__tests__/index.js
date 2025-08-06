import React from 'react';
import {
  render,
  screen,
  act,
  within,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route } from 'react-router-dom';
import { SCOPE_IDS } from '@ttahub/common/src/constants';
import fetchMock from 'fetch-mock';
import moment from 'moment';
import ViewGoalDetails from '..';
import UserContext from '../../../../../UserContext';
import AppLoadingContext from '../../../../../AppLoadingContext';
import { DATE_DISPLAY_FORMAT } from '../../../../../Constants';

const formatDate = (date) => moment(date).format(DATE_DISPLAY_FORMAT);

const mockGoalHistory = [
  {
    id: 1,
    name: 'Standard Goal Example',
    status: 'In Progress',
    createdAt: '2025-01-15T00:00:00.000Z',
    goalTemplateId: 1,
    grantId: 1,
    goalTemplate: {
      id: 1,
      templateName: 'Improve Child Development',
    },
    grant: {
      id: 1,
      number: '012345 HS',
    },
    goalCollaborators: [
      {
        goalId: 1,
        userId: 1,
        collaboratorType: { name: 'Creator' },
        user: { id: 1, name: 'Test User' },
      },
    ],
    objectives: [
      {
        id: 1,
        title: 'Implement new curriculum',
        status: 'In Progress',
        activityReportObjectives: [
          {
            activityReport: { id: 101, displayId: 'R-101' },
            topics: [{ id: 1, name: 'Topic A' }, { id: 2, name: 'Topic B' }],
            resources: [{ id: 1, url: 'http://example.com/resource1', title: 'Resource 1' }],
          },
          {
            activityReport: { id: 102, displayId: 'R-102' },
            topics: [{ id: 2, name: 'Topic B' }, { id: 3, name: 'Topic C' }],
            resources: [{ id: 2, url: 'http://example.com/resource2' }],
          },
          {
            activityReport: null,
            topics: [],
            resources: [],
          },
        ],
      },
      {
        id: 2,
        title: 'Objective with no reports/topics/resources',
        status: 'Not Started',
        activityReportObjectives: [],
      },
      {
        id: 3,
        title: 'Objective with null reports',
        status: 'Not Started',
        activityReportObjectives: null,
      },
    ],
    // status changes out of order to test sorting, added 'Closed' status
    statusChanges: [
      {
        id: 2, goalId: 1, userId: 1, oldStatus: 'Not Started', newStatus: 'In Progress', createdAt: '2025-01-02T00:00:00.000Z', user: { name: 'Test User' },
      },
      {
        id: 1, goalId: 1, userId: 1, oldStatus: null, newStatus: 'Not Started', createdAt: '2025-01-01T00:00:00.000Z', user: { name: 'Test User' },
      },
      {
        id: 3, goalId: 1, userId: 2, oldStatus: 'In Progress', newStatus: 'Suspended', createdAt: '2025-01-10T00:00:00.000Z', user: { name: 'Another User' },
      },
      {
        id: 4, goalId: 1, userId: 1, oldStatus: 'Suspended', newStatus: 'Complete', createdAt: '2025-01-12T00:00:00.000Z', user: null,
      },
      {
        id: 6, goalId: 1, userId: 2, oldStatus: 'Complete', newStatus: 'Closed', createdAt: '2025-01-13T00:00:00.000Z', user: { name: 'Another User' },
      },
      {
        id: 5, goalId: 1, userId: 1, oldStatus: 'Closed', newStatus: 'Unknown Status', createdAt: '2025-01-14T00:00:00.000Z', user: { name: 'Test User' },
      },
    ],
    responses: [
      { id: 1, goalId: 1, response: ['Root cause 1', 'Root cause 2'] },
    ],
  },
  {
    id: 2,
    name: 'Standard Goal Example - Old',
    status: 'Closed',
    createdAt: '2024-12-01T00:00:00.000Z',
    goalTemplateId: 1,
    grantId: 1,
    goalTemplate: null,
    grant: null,
    objectives: [],
    statusChanges: [
      {
        id: 10, goalId: 2, userId: null, oldStatus: null, newStatus: 'Not Started', createdAt: '2024-12-01T00:00:00.000Z', user: null,
      },
    ],
    goalCollaborators: [],
    responses: null,
  },
  {
    id: 4,
    name: 'Goal with Creator No User',
    status: 'Not Started',
    createdAt: '2024-11-01T00:00:00.000Z',
    goalTemplate: null,
    grant: null,
    objectives: [],
    statusChanges: [
      {
        id: 11, goalId: 4, userId: null, oldStatus: null, newStatus: 'Not Started', createdAt: '2024-11-01T00:00:00.000Z', user: null,
      },
    ],
    goalCollaborators: [
      {
        goalId: 4,
        userId: 99,
        collaboratorType: { name: 'Creator' },
        user: null,
      },
    ],
    responses: null,
  },
  {
    id: 5,
    name: 'Goal with Creator, No Status Changes',
    status: 'Not Started',
    createdAt: '2024-10-01T00:00:00.000Z',
    goalTemplate: null,
    grant: null,
    objectives: [],
    statusChanges: [],
    goalCollaborators: [
      {
        goalId: 5,
        userId: 100,
        collaboratorType: { name: 'Creator' },
        user: { id: 100, name: 'Pizza Man' },
      },
    ],
    responses: null,
  },
];

const historyWithNulls = [
  {
    ...mockGoalHistory[0],
    id: 3,
    goalTemplate: null,
    grant: null,
    name: null,
    responses: [],
  },
  mockGoalHistory[1],
  mockGoalHistory[3], // Include G-5
];

describe('ViewGoalDetails', () => {
  const recipient = {
    id: 1,
    name: 'John Doe',
    grants: [{ id: 1, numberWithProgramTypes: 'Grant 1' }],
  };
  const regionId = '1';
  const goalId = '1';
  const goalHistoryUrl = `/api/goals/${goalId}/history`;

  const DEFAULT_USER = {
    id: 1,
    permissions: [{ regionId: 1, scopeId: SCOPE_IDS.READ_REPORTS }],
  };

  const renderViewGoalDetails = (user = DEFAULT_USER, search = `?goalId=${goalId}`) => render(
    <UserContext.Provider value={{ user }}>
      <AppLoadingContext.Provider value={{
        setIsAppLoading: jest.fn(),
        setAppLoadingText: jest.fn(),
      }}
      >
        <MemoryRouter initialEntries={[`/recipient-tta-records/1/region/1/goals/standard${search}`]}>
          <Route path="/recipient-tta-records/:recipientId/region/:regionId/goals/standard">
            <ViewGoalDetails recipient={recipient} regionId={regionId} />
          </Route>
        </MemoryRouter>
      </AppLoadingContext.Provider>
    </UserContext.Provider>,
  );

  afterEach(() => fetchMock.restore());

  test('renders the page heading with recipient name and region id', async () => {
    fetchMock.get(goalHistoryUrl, mockGoalHistory); // setup mock
    await act(async () => {
      renderViewGoalDetails();
    });
    await waitFor(() => expect(fetchMock.called(goalHistoryUrl)).toBe(true));
    const heading = await screen.findByRole('heading', { name: /TTA Goals for John Doe - Region 1/i, level: 1 });
    expect(heading).toBeInTheDocument();
  });

  test('renders the goal name or template name in summary', async () => {
    // test case 1: First goal has a name
    fetchMock.get(goalHistoryUrl, mockGoalHistory);
    await act(async () => {
      renderViewGoalDetails();
    });
    // summary always shows first goal's name/template
    await waitFor(() => expect(screen.getByText('Standard Goal Example')).toBeInTheDocument());
    fetchMock.restore(); // Clean up before next render

    // test case 2: first goal has null name and null template -> defaults to 'Standard Goal'
    fetchMock.get(goalHistoryUrl, historyWithNulls);
    await act(async () => {
      renderViewGoalDetails();
    });
    await waitFor(() => expect(screen.getByText('Standard Goal')).toBeInTheDocument());
  });

  test('renders the grant number or N/A in summary', async () => {
    // test case 1: first goal has grant number
    fetchMock.get(goalHistoryUrl, mockGoalHistory);
    await act(async () => {
      renderViewGoalDetails();
    });
    await waitFor(() => expect(screen.getByText('012345 HS')).toBeInTheDocument());
    fetchMock.restore();

    // test case 2: first goal has null grant -> shows N/A
    fetchMock.get(goalHistoryUrl, historyWithNulls);
    await act(async () => {
      renderViewGoalDetails();
    });
    await waitFor(() => expect(screen.getByText('N/A')).toBeInTheDocument());
  });

  test('renders the accordion with goal history, sorted correctly', async () => {
    fetchMock.get(goalHistoryUrl, mockGoalHistory);
    await act(async () => {
      renderViewGoalDetails();
    });
    const accordionButtons = await screen.findAllByRole('button', { name: /G-\d+ \|/ });
    expect(accordionButtons).toHaveLength(4); // Added goal G-4 and G-5
    // expecting G-1 (latest), G-2, G-4, then G-5 (oldest) based on createdAt
    expect(accordionButtons[0]).toHaveTextContent('G-1 | In Progress'); // 2025-01-15
    expect(accordionButtons[1]).toHaveTextContent('G-2 | Closed'); // 2024-12-01
    expect(accordionButtons[2]).toHaveTextContent('G-4 | Not Started'); // 2024-11-01
    expect(accordionButtons[3]).toHaveTextContent('G-5 | Not Started'); // 2024-10-01
  });
  test('handles missing query parameters', async () => {
    await act(async () => {
      renderViewGoalDetails(DEFAULT_USER, ''); // no goalId
    });
    expect(fetchMock.called(goalHistoryUrl)).toBe(false);
    expect(await screen.findByText('Missing required parameters')).toBeInTheDocument();
  });

  test('handles fetch error (500 status)', async () => {
    fetchMock.get(goalHistoryUrl, 500); // setup mock for error
    await act(async () => {
      renderViewGoalDetails();
    });
    await waitFor(() => expect(fetchMock.called(goalHistoryUrl)).toBe(true));
    expect(await screen.findByText('There was an error fetching goal history')).toBeInTheDocument();
  });

  test('handles fetch throwing an error', async () => {
    fetchMock.get(goalHistoryUrl, { throws: new Error('Network failed') }); // setup mock to throw
    await act(async () => {
      renderViewGoalDetails();
    });
    await waitFor(() => expect(fetchMock.called(goalHistoryUrl)).toBe(true));
    expect(await screen.findByText('There was an error fetching goal history')).toBeInTheDocument();
  });

  test('handles no goals found (empty array)', async () => {
    fetchMock.get(goalHistoryUrl, []); // setup mock for empty response
    await act(async () => {
      renderViewGoalDetails();
    });
    await waitFor(() => expect(fetchMock.called(goalHistoryUrl)).toBe(true));
    expect(await screen.findByText('No goal history found')).toBeInTheDocument();
  });

  test('handles permissions mismatch', async () => {
    await act(async () => {
      renderViewGoalDetails({ id: 1, permissions: [] }); // no permissions for region 1
    });
    // fetch shouldn't happen because of early return
    expect(fetchMock.called(goalHistoryUrl)).toBe(false);
    expect(await screen.findByText(/You don't have permission to view this page/i)).toBeInTheDocument();
  });

  test('renders the back to RTTAPA link', async () => {
    fetchMock.get(goalHistoryUrl, mockGoalHistory);
    await act(async () => {
      renderViewGoalDetails();
    });
    const link = await screen.findByRole('link', { name: /Back to RTTAPA/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/recipient-tta-records/1/region/1/rttapa/');
  });

  test('renders goal status updates correctly sorted and formatted', async () => {
    fetchMock.get(goalHistoryUrl, mockGoalHistory);
    await act(async () => {
      renderViewGoalDetails();
    });
    const firstAccordionItem = await screen.findByRole('button', { name: /G-1 \| In Progress/i });
    // ensure accordion is expanded if needed (it should be by default for the first item)
    await waitFor(() => expect(firstAccordionItem).toHaveAttribute('aria-expanded', 'true'));

    const accordionContent = document.getElementById(firstAccordionItem.getAttribute('aria-controls'));
    const updatesList = within(accordionContent).getByRole('list', { name: /Goal status updates/i });
    const updates = within(updatesList).getAllByRole('listitem');

    // check sorting (component sorts ascending) and formatting
    expect(updates).toHaveLength(6);
    expect(updates[0]).toHaveTextContent(`Added on ${formatDate('2025-01-01T00:00:00.000Z')} by Test User`);
    expect(updates[1]).toHaveTextContent(`Started on ${formatDate('2025-01-02T00:00:00.000Z')} by Test User`);
    expect(updates[2]).toHaveTextContent(`Suspended on ${formatDate('2025-01-10T00:00:00.000Z')} by Another User`);
    expect(updates[3]).toHaveTextContent(`Completed on ${formatDate('2025-01-12T00:00:00.000Z')}`); // User is null, so no 'by'
    expect(updates[4]).toHaveTextContent(`Closed on ${formatDate('2025-01-13T00:00:00.000Z')} by Another User`); // Check Closed status
    expect(updates[5]).toHaveTextContent(`Unknown Status on ${formatDate('2025-01-14T00:00:00.000Z')} by Test User`);
  });

  test('renders objective information including reports, topics, and resources', async () => {
    fetchMock.get(goalHistoryUrl, mockGoalHistory);
    await act(async () => {
      renderViewGoalDetails();
    });
    const firstAccordionButton = await screen.findByRole('button', { name: /G-1 \| In Progress/i });
    await waitFor(() => expect(firstAccordionButton).toHaveAttribute('aria-expanded', 'true'));
    const firstAccordionContent = document.getElementById(firstAccordionButton.getAttribute('aria-controls'));

    // objective 1: has reports, topics, resources
    const objective1 = within(firstAccordionContent).getByText('Implement new curriculum').closest('div.margin-bottom-3');
    expect(within(objective1).getByText('Objective summary')).toBeInTheDocument();
    expect(within(objective1).getByText('Implement new curriculum')).toBeInTheDocument();
    expect(within(objective1).getByText('In Progress')).toBeInTheDocument();

    // reports
    const reportsLabel = within(objective1).getByText('Reports');
    const reportsContainer = reportsLabel.closest('div').parentElement;
    const reportsValue = within(reportsContainer).getAllByTestId('read-only-value')
      .find((el) => el.textContent.includes('R-101'));

    const reportLink1 = within(reportsValue).getByRole('link', { name: 'R-101' });
    const reportLink2 = within(reportsValue).getByRole('link', { name: 'R-102' });
    expect(reportLink1).toHaveAttribute('href', '/activity-reports/101');
    expect(reportLink2).toHaveAttribute('href', '/activity-reports/102');
    expect(reportsValue).toHaveTextContent('R-101, R-102'); // check comma separation

    // topics (unique and sorted)
    const topicsLabel = within(objective1).getByText('Topics');
    const topicsContainer = topicsLabel.closest('div').parentElement;
    const topicsValue = within(topicsContainer).getAllByTestId('read-only-value')
      .find((el) => el.textContent.includes('Topic'));

    expect(topicsValue).toHaveTextContent('Topic A, Topic B, Topic C'); // check unique, comma-separated

    // Resources
    // Resources are handled differently in the component - they use a separate p and ul structure
    const resourcesLabel = within(objective1).getByText('Resources');
    // Since resources use a different structure (not ReadOnlyField), we can use nextElementSibling
    const resourceList = resourcesLabel.nextElementSibling;
    // Verify we found the right element
    expect(resourceList.tagName).toBe('UL');

    const resourceLink1 = within(resourceList).getByRole('link', { name: 'Resource 1' });
    const resourceLink2 = within(resourceList).getByRole('link', { name: 'http://example.com/resource2' });
    expect(resourceLink1).toHaveAttribute('href', 'http://example.com/resource1');
    expect(resourceLink2).toHaveAttribute('href', 'http://example.com/resource2');
  });

  test('renders root causes', async () => {
    fetchMock.get(goalHistoryUrl, mockGoalHistory);
    await act(async () => {
      renderViewGoalDetails();
    });
    const firstAccordionButton = await screen.findByRole('button', { name: /G-1 \| In Progress/i });
    await waitFor(() => expect(firstAccordionButton).toHaveAttribute('aria-expanded', 'true'));
    const firstAccordionContent = document.getElementById(firstAccordionButton.getAttribute('aria-controls'));

    expect(within(firstAccordionContent).getByText('Root causes')).toBeInTheDocument();
    expect(within(firstAccordionContent).getByText('Root cause 1, Root cause 2')).toBeInTheDocument();
  });
  test('does not render root causes section when responses are null or empty', async () => {
    // test case 1: responses is null
    fetchMock.get(goalHistoryUrl, mockGoalHistory); // G-2 has responses: null
    await act(async () => {
      renderViewGoalDetails();
    });
    const accordionButtonNull = await screen.findByRole('button', { name: /G-2 \| Closed/i });
    await act(async () => { userEvent.click(accordionButtonNull); });
    await waitFor(() => expect(accordionButtonNull).toHaveAttribute('aria-expanded', 'true'));
    const accordionContentNull = document.getElementById(accordionButtonNull.getAttribute('aria-controls'));
    await waitFor(() => {
      expect(within(accordionContentNull).queryByText('Root causes')).not.toBeInTheDocument();
    });
    fetchMock.restore();

    // test case 2: responses is empty array
    fetchMock.get(goalHistoryUrl, historyWithNulls); // G-3 has responses: []
    await act(async () => {
      renderViewGoalDetails();
    });
    const accordionButtonEmpty = await screen.findByRole('button', { name: /G-3 \| In Progress/i });
    await waitFor(() => expect(accordionButtonEmpty).toHaveAttribute('aria-expanded', 'true'));
    const accordionContentEmpty = document.getElementById(accordionButtonEmpty.getAttribute('aria-controls'));
    await waitFor(() => {
      expect(within(accordionContentEmpty).queryByText('Root causes')).not.toBeInTheDocument();
    });
  });

  test('renders fallback status update with creator name when statusChanges is empty', async () => {
    fetchMock.get(goalHistoryUrl, mockGoalHistory);
    await act(async () => {
      renderViewGoalDetails();
    });

    // find the accordion button for G-5
    const accordionButtonG5 = await screen.findByRole('button', { name: /G-5 \| Not Started/i });
    await act(async () => { userEvent.click(accordionButtonG5); });
    await waitFor(() => expect(accordionButtonG5).toHaveAttribute('aria-expanded', 'true'));

    const accordionContentG5 = document.getElementById(accordionButtonG5.getAttribute('aria-controls'));
    const updatesList = within(accordionContentG5).getByRole('list', { name: /Goal status updates/i });
    const updates = within(updatesList).getAllByRole('listitem');

    // G-5 has no statusChanges, so it uses the fallback rendering
    // It has a creator with a user object, so it should display 'by Pizza Man'
    expect(updates).toHaveLength(1);
    expect(updates[0]).toHaveTextContent(`Added on ${formatDate('2024-10-01T00:00:00.000Z')} by Pizza Man`);
  });
});
