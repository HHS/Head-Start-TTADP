import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fetchMock from 'fetch-mock';
import PropTypes from 'prop-types';
import { SCOPE_IDS } from '@ttahub/common';
import Routes from '../Routes';
import UserContext from '../UserContext';
import AriaLiveContext from '../AriaLiveContext';
import MyGroupsProvider from '../components/MyGroupsProvider';

const defaultFlags = [
  'quality_assurance_dashboard',
  'resources_dashboard',
  'view_courses',
  'communication_log',
];

// mock child components lightly to ensure they render *something* identifiable
// this avoids needing to mock deeply nested dependencies of each page
jest.mock('../pages/Home', () => () => <div>Home Page Welcome</div>);
jest.mock('../pages/Landing', () => () => <div>Activity Reports Landing</div>);
jest.mock('../pages/ActivityReport', () => () => <div>Activity Report Form</div>);
jest.mock('../pages/ApprovedActivityReport', () => () => <div>Approved Activity Report View</div>);
jest.mock('../pages/LegacyReport', () => () => <div>Legacy Report View</div>);
jest.mock('../pages/RecipientRecord', () => () => <div>Recipient TTA Record</div>);
jest.mock('../pages/RecipientSearch', () => () => <div>Recipient Search Page</div>);
jest.mock('../pages/RegionalDashboard', () => () => <div>Regional Dashboard Page</div>);
jest.mock('../pages/ResourcesDashboard', () => () => <div>Resources Dashboard Page</div>);
jest.mock('../pages/CourseDashboard', () => () => <div>Course Dashboard Page</div>);
jest.mock('../pages/TrainingReports', () => () => <div>Training Reports Page</div>);
jest.mock('../pages/TrainingReportForm', () => () => <div>Training Report Form Page</div>);
jest.mock('../pages/ViewTrainingReport', () => () => <div>View Training Report Page</div>);
jest.mock('../pages/SessionForm', () => () => <div>Session Form Page</div>);
jest.mock('../pages/AccountManagement', () => () => <div>Account Management Page</div>);
jest.mock('../pages/AccountManagement/MyGroups', () => () => <div>My Groups Page</div>);
jest.mock('../pages/AccountManagement/Group', () => () => <div>Group Details Page</div>);
jest.mock('../pages/Notifications', () => () => <div>Notifications Page</div>);
jest.mock('../pages/Admin', () => () => <div>Admin Center Page</div>);
jest.mock('../pages/QADashboard', () => () => <div>QA Dashboard Page</div>);
jest.mock('../pages/QADashboard/RecipientsWithNoTta', () => () => <div>Recipients With No TTA Page</div>);
jest.mock('../pages/QADashboard/RecipientsWithClassScoresAndGoals', () => () => <div>Recipients With Class Scores and Goals Page</div>);
jest.mock('../pages/QADashboard/RecipientsWithOhsStandardFeiGoal', () => () => <div>Recipients With OHS Standard FEI Goal Page</div>);
jest.mock('../pages/RegionalCommunicationLogDashboard', () => () => <div>Communication Log Dashboard Page</div>);
jest.mock('../pages/RegionalCommunicationLog', () => () => <div>Regional Communication Log Form Page</div>);
jest.mock('../pages/RegionalCommunicationLog/ViewRegionalCommunicationLog', () => () => <div>View Communication Log Page</div>);

function MockSomethingWentWrong({ responseCode }) {
  return (
    <div>
      Something Went Wrong Page Code:
      {responseCode}
    </div>
  );
}
MockSomethingWentWrong.propTypes = { responseCode: PropTypes.string };
MockSomethingWentWrong.defaultProps = { responseCode: null };

jest.mock('../components/SomethingWentWrong', () => MockSomethingWentWrong);
jest.mock('../pages/Logout', () => () => <div>Logging Out Page</div>);
jest.mock('../pages/Unauthenticated', () => () => <div>Unauthenticated Page</div>);
jest.mock('../components/RequestPermissions', () => () => <div>Request Permissions Page</div>);

function MockFeatureFlag({ flag, children, renderNotFound }) {
  if (flag === 'quality_assurance_dashboard' && !window.test_quality_assurance_dashboard_flag) {
    return renderNotFound ? <div>QA Dashboard Flag Not Found</div> : null;
  }
  return children;
}
MockFeatureFlag.propTypes = {
  flag: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  renderNotFound: PropTypes.bool,
};
MockFeatureFlag.defaultProps = {
  renderNotFound: false,
};

jest.mock('../components/FeatureFlag', () => MockFeatureFlag);

const RenderRoutes = async (
  initialEntries,
  authenticated = true,
  userOverrides = {},
  routeProps = {},
  authError = null,
) => {
  const logout = jest.fn();
  const announce = jest.fn();
  const setAreThereUnreadNotifications = jest.fn();
  const updateUser = jest.fn();

  const defaultUser = {
    id: 1,
    name: 'Test User',
    homeRegionId: 1,
    permissions: [
      { regionId: 1, scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS },
      { regionId: 1, scopeId: SCOPE_IDS.READ_REPORTS },
      { regionId: 1, scopeId: SCOPE_IDS.ADMIN },
    ],
    flags: defaultFlags,
    roles: [{ name: 'Admin' }],
  };

  const user = { ...defaultUser, ...userOverrides };

  window.test_quality_assurance_dashboard_flag = user.flags.includes('quality_assurance_dashboard');

  const defaultProps = {
    alert: null,
    logout,
    announce,
    user,
    authenticated,
    areThereUnreadNotifications: false,
    setAreThereUnreadNotifications,
    authError,
    updateUser,
    loggedOut: false,
    timedOut: false,
    notifications: null,
    ...routeProps,
  };

  await act(async () => {
    render(
      <MemoryRouter initialEntries={[initialEntries]}>
        <AriaLiveContext.Provider value={{ announce }}>
          <MyGroupsProvider authenticated={authenticated}>
            <UserContext.Provider value={{ user, authenticated, logout }}>
              <Routes
                alert={defaultProps.alert}
                logout={defaultProps.logout}
                announce={defaultProps.announce}
                user={defaultProps.user}
                authenticated={defaultProps.authenticated}
                areThereUnreadNotifications={defaultProps.areThereUnreadNotifications}
                setAreThereUnreadNotifications={defaultProps.setAreThereUnreadNotifications}
                authError={defaultProps.authError}
                updateUser={defaultProps.updateUser}
                loggedOut={defaultProps.loggedOut}
                timedOut={defaultProps.timedOut}
                notifications={defaultProps.notifications}
              />
            </UserContext.Provider>
          </MyGroupsProvider>
        </AriaLiveContext.Provider>
      </MemoryRouter>,
    );
  });
};

describe('Routes', () => {
  beforeEach(() => {
    fetchMock.get('/api/user', { name: 'test user', permissions: [], flags: {} });
    fetchMock.get('/api/alerts', []);
    fetchMock.get('/api/groups', []);
    fetchMock.get('/api/users/settings', []);
    fetchMock.get('/api/widgets/unreadNotifications', { count: 0 });

    // use a fallback for any other GET/POST/etc. request to avoid test failures
    // due to unmocked APIs called by the *actual* page components (which we've mocked).
    // respond with a simple success status or empty data.
    fetchMock.mock('*', 200, { overwriteRoutes: false, fallbackToNetwork: false });
  });

  afterEach(() => {
    fetchMock.restore();
    delete window.test_quality_assurance_dashboard_flag;
  });

  // --- authenticated routes ---

  it('renders the Home page for "/"', async () => {
    await RenderRoutes('/');
    expect(await screen.findByText('Home Page Welcome')).toBeInTheDocument();
  });

  it('renders the Landing page for "/activity-reports"', async () => {
    await RenderRoutes('/activity-reports');
    expect(await screen.findByText('Activity Reports Landing')).toBeInTheDocument();
  });

  it('renders the Activity Report form for "/activity-reports/new/activity-summary"', async () => {
    await RenderRoutes('/activity-reports/new/activity-summary');
    expect(await screen.findByText('Activity Report Form')).toBeInTheDocument();
  });

  it('renders the Approved Activity Report view for "/activity-reports/view/:id"', async () => {
    await RenderRoutes('/activity-reports/view/123');
    expect(await screen.findByText('Approved Activity Report View')).toBeInTheDocument();
  });

  it('renders the Legacy Report view for "/activity-reports/legacy/:id"', async () => {
    await RenderRoutes('/activity-reports/legacy/R01-AR-999');
    expect(await screen.findByText('Legacy Report View')).toBeInTheDocument();
  });

  it('renders the Recipient Record page for "/recipient-tta-records/:recipientId/region/:regionId"', async () => {
    await RenderRoutes('/recipient-tta-records/1/region/1');
    expect(await screen.findByText('Recipient TTA Record')).toBeInTheDocument();
  });

  it('renders the Recipient Search page for "/recipient-tta-records"', async () => {
    await RenderRoutes('/recipient-tta-records');
    expect(await screen.findByText('Recipient Search Page')).toBeInTheDocument();
  });

  it('renders the Regional Dashboard page for "/dashboards/regional-dashboard/activity-reports"', async () => {
    await RenderRoutes('/dashboards/regional-dashboard/activity-reports');
    expect(await screen.findByText('Regional Dashboard Page')).toBeInTheDocument();
  });

  it('renders the Regional Dashboard page for "/dashboards/regional-dashboard/training-reports"', async () => {
    await RenderRoutes('/dashboards/regional-dashboard/training-reports');
    expect(await screen.findByText('Regional Dashboard Page')).toBeInTheDocument();
  });

  it('renders the Resources Dashboard page for "/dashboards/resources-dashboard"', async () => {
    await RenderRoutes('/dashboards/resources-dashboard');
    expect(await screen.findByText('Resources Dashboard Page')).toBeInTheDocument();
  });

  it('renders the Course Dashboard page for "/dashboards/ipd-courses"', async () => {
    await RenderRoutes('/dashboards/ipd-courses');
    expect(await screen.findByText('Course Dashboard Page')).toBeInTheDocument();
  });

  it('renders the Training Reports page for "/training-reports/not-started"', async () => {
    await RenderRoutes('/training-reports/not-started');
    expect(await screen.findByText('Training Reports Page')).toBeInTheDocument();
  });

  it('renders the Training Report Form page for "/training-report/:id/event-summary"', async () => {
    await RenderRoutes('/training-report/1/event-summary');
    expect(await screen.findByText('Training Report Form Page')).toBeInTheDocument();
  });

  it('renders the View Training Report page for "/training-report/view/:id"', async () => {
    await RenderRoutes('/training-report/view/1');
    expect(await screen.findByText('View Training Report Page')).toBeInTheDocument();
  });

  it('renders the Session Form page for "/training-report/:trId/session/:sessionId/session-summary"', async () => {
    await RenderRoutes('/training-report/1/session/new/session-summary');
    expect(await screen.findByText('Session Form Page')).toBeInTheDocument();
  });

  it('renders the Account Management page for "/account"', async () => {
    await RenderRoutes('/account');
    expect(await screen.findByText('Account Management Page')).toBeInTheDocument();
  });

  it('renders the My Groups page for "/account/my-groups"', async () => {
    await RenderRoutes('/account/my-groups');
    expect(await screen.findByText('My Groups Page')).toBeInTheDocument();
  });

  it('renders the Group page for "/account/group/:id"', async () => {
    await RenderRoutes('/account/group/1');
    expect(await screen.findByText('Group Details Page')).toBeInTheDocument();
  });

  it('renders the Notifications page for "/notifications"', async () => {
    await RenderRoutes('/notifications');
    expect(await screen.findByText('Notifications Page')).toBeInTheDocument();
  });

  it('renders the Admin page for "/admin" for admin users', async () => {
    await RenderRoutes('/admin', true, { roles: [{ name: 'Admin' }] });
    expect(await screen.findByText('Admin Center Page')).toBeInTheDocument();
  });

  it('renders the QA Dashboard page for "/dashboards/qa-dashboard"', async () => {
    await RenderRoutes('/dashboards/qa-dashboard');
    expect(await screen.findByText('QA Dashboard Page')).toBeInTheDocument();
  });

  it('renders the QA Recipients With No TTA page', async () => {
    await RenderRoutes('/dashboards/qa-dashboard/recipients-with-no-tta');
    expect(await screen.findByText('Recipients With No TTA Page')).toBeInTheDocument();
  });

  it('renders the QA Recipients With Class Scores and Goals page', async () => {
    await RenderRoutes('/dashboards/qa-dashboard/recipients-with-class-scores-and-goals');
    expect(await screen.findByText('Recipients With Class Scores and Goals Page')).toBeInTheDocument();
  });

  it('renders the QA Recipients With OHS Standard FEI Goal page', async () => {
    await RenderRoutes('/dashboards/qa-dashboard/recipients-with-ohs-standard-fei-goal');
    expect(await screen.findByText('Recipients With OHS Standard FEI Goal Page')).toBeInTheDocument();
  });

  it('renders the Regional Communication Log Dashboard page', async () => {
    await RenderRoutes('/communication-log');
    expect(await screen.findByText('Communication Log Dashboard Page')).toBeInTheDocument();
  });

  it('renders the Regional Communication Log form page', async () => {
    await RenderRoutes('/communication-log/region/1/log/new');
    expect(await screen.findByText('Regional Communication Log Form Page')).toBeInTheDocument();
  });

  it('renders the View Regional Communication Log page', async () => {
    await RenderRoutes('/communication-log/region/1/log/123/view');
    expect(await screen.findByText('View Communication Log Page')).toBeInTheDocument();
  });

  it('renders the Something Went Wrong page for "/something-went-wrong/:code"', async () => {
    await RenderRoutes('/something-went-wrong/500');
    expect(await screen.findByText(/Something Went Wrong Page Code:\s*500/i)).toBeInTheDocument();
  });

  it('renders the Logout page for "/logout"', async () => {
    await RenderRoutes('/logout');
    expect(await screen.findByText('Logging Out Page')).toBeInTheDocument();
  });

  it('redirects unknown authenticated paths to 404', async () => {
    await RenderRoutes('/this/path/does/not/exist');
    expect(await screen.findByText(/Something Went Wrong Page Code:\s*404/i)).toBeInTheDocument();
  });

  // --- feature flag scenarios ---

  it('does not render QA Dashboard if flag is off', async () => {
    const flagsWithoutQA = defaultFlags.filter((f) => f !== 'quality_assurance_dashboard');
    await RenderRoutes('/dashboards/qa-dashboard', true, { flags: flagsWithoutQA });
    expect(await screen.findByText('QA Dashboard Flag Not Found')).toBeInTheDocument();
  });

  // --- unauthenticated scenarios ---

  it('renders Unauthenticated component when not authenticated on "/"', async () => {
    await RenderRoutes('/', false);
    expect(await screen.findByText('Unauthenticated Page')).toBeInTheDocument();
  });

  it('renders Unauthenticated component when not authenticated on "/activity-reports"', async () => {
    await RenderRoutes('/activity-reports', false);
    expect(await screen.findByText('Unauthenticated Page')).toBeInTheDocument();
  });

  it('renders Request Permissions component when authError is 403', async () => {
    await RenderRoutes('/', false, {}, {}, 403);
    expect(await screen.findByText('Request Permissions Page')).toBeInTheDocument();
  });
});
