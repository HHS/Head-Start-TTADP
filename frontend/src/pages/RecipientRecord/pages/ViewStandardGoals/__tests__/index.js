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
import { GOAL_STATUS, SCOPE_IDS } from '@ttahub/common/src/constants';
import fetchMock from 'fetch-mock';
import { format, parseISO } from 'date-fns';
import ViewGoalDetails from '..';
import UserContext from '../../../../../UserContext';
import AppLoadingContext from '../../../../../AppLoadingContext';
import { DATE_DISPLAY_FORMAT, OBJECTIVE_STATUS } from '../../../../../Constants';

const formatDate = (date) => format(parseISO(date), DATE_DISPLAY_FORMAT);

const mockGoalHistory = [
  {
    id: 1,
    name: 'Standard Goal Example',
    status: GOAL_STATUS.IN_PROGRESS,
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
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        activityReportObjectives: [
          {
            activityReport: { id: 101, displayId: 'R-101' },
            topics: [{ id: 1, name: 'Topic A' }, { id: 2, name: 'Topic B' }],
            resources: [{ id: 1, url: 'http://example.com/resource1', title: 'Resource 1' }],
            files: [
              { id: 201, originalFileName: 'report101-file1.pdf' },
              { id: 202, originalFileName: 'report101-file2.docx' },
            ],
            activityReportObjectiveCourses: [
              { course: { id: 301, name: 'Early Childhood Development Course' } },
            ],
          },
          {
            activityReport: { id: 102, displayId: 'R-102' },
            topics: [{ id: 2, name: 'Topic B' }, { id: 3, name: 'Topic C' }],
            resources: [{ id: 2, url: 'http://example.com/resource2' }],
            files: [
              { id: 203, originalFileName: 'report102-file1.xlsx' },
            ],
            activityReportObjectiveCourses: [
              { course: { id: 302, name: 'Classroom Management' } },
              { course: { id: 303, name: 'Family Engagement Strategies' } },
            ],
          },
          {
            activityReport: null,
            topics: [],
            resources: [],
            files: [],
            activityReportObjectiveCourses: [],
          },
        ],
      },
      {
        id: 2,
        title: 'Objective with no reports/topics/resources',
        status: OBJECTIVE_STATUS.NOT_STARTED,
        activityReportObjectives: [],
      },
      {
        id: 3,
        title: 'Objective with null reports',
        status: OBJECTIVE_STATUS.NOT_STARTED,
        activityReportObjectives: null,
      },
    ],
    // status changes out of order to test sorting, added 'Closed' status
    statusChanges: [
      {
        id: 2, goalId: 1, userId: 1, oldStatus: GOAL_STATUS.NOT_STARTED, newStatus: GOAL_STATUS.IN_PROGRESS, createdAt: '2025-01-02T00:00:00.000Z', user: { name: 'Test User', roles: [{ name: 'Program Specialist' }] },
      },
      {
        id: 1, goalId: 1, userId: 1, oldStatus: null, newStatus: GOAL_STATUS.NOT_STARTED, createdAt: '2025-01-01T00:00:00.000Z', user: { name: 'Test User', roles: [{ name: 'Program Specialist' }] },
      },
      {
        id: 3, goalId: 1, userId: 2, oldStatus: GOAL_STATUS.IN_PROGRESS, newStatus: GOAL_STATUS.SUSPENDED, createdAt: '2025-01-10T00:00:00.000Z', user: { name: 'Another User', roles: [{ name: 'Program Manager' }] },
      },
      {
        id: 4, goalId: 1, userId: 1, oldStatus: GOAL_STATUS.SUSPENDED, newStatus: 'Complete', createdAt: '2025-01-12T00:00:00.000Z', user: null,
      },
      {
        id: 6, goalId: 1, userId: 2, oldStatus: 'Complete', newStatus: GOAL_STATUS.CLOSED, createdAt: '2025-01-13T00:00:00.000Z', user: { name: 'Another User', roles: [{ name: 'Program Manager' }] },
      },
      {
        id: 5, goalId: 1, userId: 1, oldStatus: GOAL_STATUS.CLOSED, newStatus: 'Unknown Status', createdAt: '2025-01-14T00:00:00.000Z', user: { name: 'Test User', roles: [{ name: 'Program Specialist' }] },
      },
    ],
    responses: [
      { id: 1, goalId: 1, response: ['Root cause 1', 'Root cause 2'] },
    ],
  },
  {
    id: 2,
    name: 'Standard Goal Example - Old',
    status: GOAL_STATUS.CLOSED,
    createdAt: '2024-12-01T00:00:00.000Z',
    goalTemplateId: 1,
    grantId: 1,
    goalTemplate: null,
    grant: null,
    objectives: [],
    statusChanges: [
      {
        id: 10, goalId: 2, userId: null, oldStatus: null, newStatus: GOAL_STATUS.NOT_STARTED, createdAt: '2024-12-01T00:00:00.000Z', user: null,
      },
    ],
    goalCollaborators: [],
    responses: null,
  },
  {
    id: 4,
    name: 'Goal with Creator No User',
    status: GOAL_STATUS.NOT_STARTED,
    createdAt: '2024-11-01T00:00:00.000Z',
    goalTemplate: null,
    grant: null,
    objectives: [],
    statusChanges: [
      {
        id: 11, goalId: 4, userId: null, oldStatus: null, newStatus: GOAL_STATUS.NOT_STARTED, createdAt: '2024-11-01T00:00:00.000Z', user: null,
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
    status: GOAL_STATUS.NOT_STARTED,
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
    expect(reportLink1).toHaveAttribute('href', '/activity-reports/view/101');
    expect(reportLink2).toHaveAttribute('href', '/activity-reports/view/102');
    expect(reportsValue).toHaveTextContent('R-101, R-102'); // check comma separation

    // topics (unique and sorted)
    const topicsLabel = within(objective1).getByText('Topics');
    const topicsContainer = topicsLabel.closest('div').parentElement;
    const topicsValue = within(topicsContainer).getAllByTestId('read-only-value')
      .find((el) => el.textContent.includes('Topic'));

    expect(topicsValue).toHaveTextContent('Topic A, Topic B, Topic C'); // check unique, comma-separated

    // Resources section contains all three types: courses, resource links, and files
    // Resources are handled differently in the component - they use a separate p and ul structure
    const resourcesLabel = within(objective1).getByText('Resources');

    // Get the resource sections container
    const resourcesContainer = resourcesLabel.nextElementSibling;
    // Verify we found the right element
    expect(resourcesContainer.tagName).toBe('DIV');
    expect(resourcesContainer).toHaveClass('resource-sections-container');

    // Check courses
    const coursesList = within(resourcesContainer).getAllByRole('list');
    expect(coursesList.length).toBeGreaterThanOrEqual(1);

    const courses = within(resourcesContainer).getAllByText((content, element) => (
      ['Early Childhood Development Course', 'Classroom Management', 'Family Engagement Strategies'].includes(content)
      && element.tagName.toLowerCase() === 'li'
    ));
    expect(courses).toHaveLength(3);
    expect(courses[0]).toHaveTextContent('Early Childhood Development Course');

    // Check resource links
    const resourceLink1 = within(resourcesContainer).getByRole('link', { name: 'Resource 1' });
    const resourceLink2 = within(resourcesContainer).getByRole('link', { name: 'http://example.com/resource2' });
    expect(resourceLink1).toHaveAttribute('href', 'http://example.com/resource1');
    expect(resourceLink2).toHaveAttribute('href', 'http://example.com/resource2');

    // Check files
    const files = within(resourcesContainer).getAllByText((content, element) => (
      ['report101-file1.pdf', 'report101-file2.docx', 'report102-file1.xlsx'].includes(content)
      && element.tagName.toLowerCase() === 'li'
    ));
    expect(files).toHaveLength(3);
    expect(files[0]).toHaveTextContent('report101-file1.pdf');
    expect(files[1]).toHaveTextContent('report101-file2.docx');
    expect(files[2]).toHaveTextContent('report102-file1.xlsx');
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

  test('renders by ohs tool tip if goal is monitoring and status is Not Started', async () => {
    const monitoringGoal = {
      id: 6,
      name: 'G-6',
      status: GOAL_STATUS.NOT_STARTED,
      standard: 'Monitoring',
    };

    fetchMock.get(goalHistoryUrl, [monitoringGoal, ...mockGoalHistory]);
    await act(async () => {
      renderViewGoalDetails();
    });
    expect(screen.getByText(/by ohs/i)).toBeInTheDocument();
  });

  test('adds synthetic "Added on" with creator when initial Not Started is missing', async () => {
    // This goal has status changes but none with oldStatus=null or newStatus=Not Started,
    // so the component should synthesize an initial "Added on <createdAt> by <Creator>" entry.
    const goalWithMissingAdded = {
      id: 7,
      name: 'Goal missing initial Not Started',
      status: GOAL_STATUS.IN_PROGRESS,
      createdAt: '2025-02-01T00:00:00.000Z',
      goalTemplate: null,
      grant: null,
      objectives: [],
      statusChanges: [
        {
          id: 70, goalId: 7, userId: 10, oldStatus: GOAL_STATUS.NOT_STARTED, newStatus: GOAL_STATUS.IN_PROGRESS, createdAt: '2025-02-03T00:00:00.000Z', user: { name: 'Jane Doe', roles: [{ name: 'Program Specialist' }] },
        },
        {
          id: 71, goalId: 7, userId: 11, oldStatus: GOAL_STATUS.IN_PROGRESS, newStatus: 'Complete', createdAt: '2025-02-10T00:00:00.000Z', user: { name: 'Another PS', roles: [{ name: 'Program Specialist' }] },
        },
      ],
      goalCollaborators: [
        {
          goalId: 7,
          userId: 10,
          collaboratorType: { name: 'Creator' },
          user: { id: 10, name: 'Tom Jones' },
        },
      ],
      responses: null,
    };

    fetchMock.get('/api/goals/7/history', [goalWithMissingAdded]);
    await act(async () => {
      renderViewGoalDetails(DEFAULT_USER, '?goalId=7');
    });

    const accordionButton = await screen.findByRole('button', { name: /G-7 \| In Progress/i });
    await waitFor(() => expect(accordionButton).toHaveAttribute('aria-expanded', 'true'));
    const accordionContent = document.getElementById(accordionButton.getAttribute('aria-controls'));
    const updatesList = within(accordionContent).getByRole('list', { name: /Goal status updates/i });
    const updates = within(updatesList).getAllByRole('listitem');

    // Should synthesize the first entry as Added on <createdAt> by Tom Jones
    expect(updates[0]).toHaveTextContent(`Added on ${formatDate('2025-02-01T00:00:00.000Z')} by Tom Jones`);
    // Followed by the existing updates in ascending order
    expect(updates[1]).toHaveTextContent(`Started on ${formatDate('2025-02-03T00:00:00.000Z')} by Jane Doe`);
    expect(updates[2]).toHaveTextContent(`Completed on ${formatDate('2025-02-10T00:00:00.000Z')} by Another PS`);
  });

  test('hides resource section when no courses, links, or files exist', async () => {
    // Create a goal with an objective that has no resources
    const goalWithEmptyResources = {
      id: 8,
      name: 'Goal with no resources',
      status: GOAL_STATUS.IN_PROGRESS,
      createdAt: '2025-03-01T00:00:00.000Z',
      goalTemplate: null,
      grant: null,
      objectives: [
        {
          id: 801,
          title: 'Objective with no resources',
          status: OBJECTIVE_STATUS.IN_PROGRESS,
          activityReportObjectives: [
            {
              activityReport: { id: 801, displayId: 'R-801' },
              topics: [{ id: 801, name: 'Topic X' }],
              resources: [], // Empty resources
              files: [], // Empty files
              activityReportObjectiveCourses: [], // Empty courses
            },
          ],
        },
      ],
      statusChanges: [],
      goalCollaborators: [],
      responses: null,
    };

    fetchMock.get('/api/goals/8/history', [goalWithEmptyResources]);
    await act(async () => {
      renderViewGoalDetails(DEFAULT_USER, '?goalId=8');
    });

    const accordionButton = await screen.findByRole('button', { name: /G-8 \| In Progress/i });
    await waitFor(() => expect(accordionButton).toHaveAttribute('aria-expanded', 'true'));
    const accordionContent = document.getElementById(accordionButton.getAttribute('aria-controls'));

    const objective = within(accordionContent).getByText('Objective with no resources').closest('div.margin-bottom-3');

    // The 'Resources' heading should not be present
    expect(within(objective).queryByText('Resources')).not.toBeInTheDocument();
  });

  test('shows resource section when only courses exist', async () => {
    // Create a goal with an objective that has only courses
    const goalWithOnlyCourses = {
      id: 9,
      name: 'Goal with only courses',
      status: GOAL_STATUS.IN_PROGRESS,
      createdAt: '2025-03-01T00:00:00.000Z',
      goalTemplate: null,
      grant: null,
      objectives: [
        {
          id: 901,
          title: 'Objective with only courses',
          status: OBJECTIVE_STATUS.IN_PROGRESS,
          activityReportObjectives: [
            {
              activityReport: { id: 901, displayId: 'R-901' },
              topics: [{ id: 901, name: 'Topic Y' }],
              resources: [], // Empty resources
              files: [], // Empty files
              activityReportObjectiveCourses: [
                { course: { id: 901, name: 'Course Only Test' } },
              ],
            },
          ],
        },
      ],
      statusChanges: [],
      goalCollaborators: [],
      responses: null,
    };

    fetchMock.get('/api/goals/9/history', [goalWithOnlyCourses]);
    await act(async () => {
      renderViewGoalDetails(DEFAULT_USER, '?goalId=9');
    });

    const accordionButton = await screen.findByRole('button', { name: /G-9 \| In Progress/i });
    await waitFor(() => expect(accordionButton).toHaveAttribute('aria-expanded', 'true'));
    const accordionContent = document.getElementById(accordionButton.getAttribute('aria-controls'));

    const objective = within(accordionContent).getByText('Objective with only courses').closest('div.margin-bottom-3');

    // The 'Resources' heading should be present
    expect(within(objective).getByText('Resources')).toBeInTheDocument();

    // And the course should be visible
    const resourceContainer = within(objective).getByText('Resources').nextElementSibling;
    expect(resourceContainer).toHaveClass('resource-sections-container');
    expect(within(resourceContainer).getByText('Course Only Test')).toBeInTheDocument();
  });

  test('shows resource section when only resource links exist', async () => {
    // Create a goal with an objective that has only resource links
    const goalWithOnlyLinks = {
      id: 10,
      name: 'Goal with only links',
      status: GOAL_STATUS.IN_PROGRESS,
      createdAt: '2025-03-01T00:00:00.000Z',
      goalTemplate: null,
      grant: null,
      objectives: [
        {
          id: 1001,
          title: 'Objective with only links',
          status: OBJECTIVE_STATUS.IN_PROGRESS,
          activityReportObjectives: [
            {
              activityReport: { id: 1001, displayId: 'R-1001' },
              topics: [{ id: 1001, name: 'Topic Z' }],
              resources: [{ id: 1001, url: 'http://example.com/resource-only', title: 'Resource Only Test' }],
              files: [], // Empty files
              activityReportObjectiveCourses: [], // Empty courses
            },
          ],
        },
      ],
      statusChanges: [],
      goalCollaborators: [],
      responses: null,
    };

    fetchMock.get('/api/goals/10/history', [goalWithOnlyLinks]);
    await act(async () => {
      renderViewGoalDetails(DEFAULT_USER, '?goalId=10');
    });

    const accordionButton = await screen.findByRole('button', { name: /G-10 \| In Progress/i });
    await waitFor(() => expect(accordionButton).toHaveAttribute('aria-expanded', 'true'));
    const accordionContent = document.getElementById(accordionButton.getAttribute('aria-controls'));

    const objective = within(accordionContent).getByText('Objective with only links').closest('div.margin-bottom-3');

    // The 'Resources' heading should be present
    expect(within(objective).getByText('Resources')).toBeInTheDocument();

    // And the resource link should be visible
    const resourceContainer = within(objective).getByText('Resources').nextElementSibling;
    const resourceLink = within(resourceContainer).getByRole('link', { name: 'Resource Only Test' });
    expect(resourceLink).toHaveAttribute('href', 'http://example.com/resource-only');
  });

  test('shows resource section when only files exist', async () => {
    // Create a goal with an objective that has only files
    const goalWithOnlyFiles = {
      id: 11,
      name: 'Goal with only files',
      status: GOAL_STATUS.IN_PROGRESS,
      createdAt: '2025-03-01T00:00:00.000Z',
      goalTemplate: null,
      grant: null,
      objectives: [
        {
          id: 1101,
          title: 'Objective with only files',
          status: OBJECTIVE_STATUS.IN_PROGRESS,
          activityReportObjectives: [
            {
              activityReport: { id: 1101, displayId: 'R-1101' },
              topics: [{ id: 1101, name: 'Topic W' }],
              resources: [], // Empty resources
              files: [{ id: 1101, originalFileName: 'files-only-test.pdf' }], // Only files
              activityReportObjectiveCourses: [], // Empty courses
            },
          ],
        },
      ],
      statusChanges: [],
      goalCollaborators: [],
      responses: null,
    };

    fetchMock.get('/api/goals/11/history', [goalWithOnlyFiles]);
    await act(async () => {
      renderViewGoalDetails(DEFAULT_USER, '?goalId=11');
    });

    const accordionButton = await screen.findByRole('button', { name: /G-11 \| In Progress/i });
    await waitFor(() => expect(accordionButton).toHaveAttribute('aria-expanded', 'true'));
    const accordionContent = document.getElementById(accordionButton.getAttribute('aria-controls'));

    const objective = within(accordionContent).getByText('Objective with only files').closest('div.margin-bottom-3');

    // The 'Resources' heading should be present
    expect(within(objective).getByText('Resources')).toBeInTheDocument();

    // And the file should be visible
    const resourceContainer = within(objective).getByText('Resources').nextElementSibling;
    expect(within(resourceContainer).getByText('files-only-test.pdf')).toBeInTheDocument();
  });
});
