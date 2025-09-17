import React from 'react';
import PropTypes from 'prop-types';
import {
  Redirect,
  Route,
  Switch,
  useLocation,
} from 'react-router-dom';
import FeatureFlag from './components/FeatureFlag';
import UserContext from './UserContext';
import SiteNav from './components/SiteNav';
import Header from './components/Header';
import Admin from './pages/Admin';
import RegionalDashboard from './pages/RegionalDashboard';
import TrainingReports from './pages/TrainingReports';
import ResourcesDashboard from './pages/ResourcesDashboard';
import CourseDashboard from './pages/CourseDashboard';
import Unauthenticated from './pages/Unauthenticated';
import Home from './pages/Home';
import Landing from './pages/Landing';
import ActivityReport from './pages/ActivityReport';
import LegacyReport from './pages/LegacyReport';
import isAdmin, { canSeeBehindFeatureFlag } from './permissions';
import LandingLayout from './components/LandingLayout';
import RequestPermissions from './components/RequestPermissions';
import AriaLiveContext from './AriaLiveContext';
import ApprovedActivityReport from './pages/ApprovedActivityReport';
import CollaborationReportsLanding from './pages/CollaborationReports';
import CollaborationReport from './pages/CollaborationReportForm';
import RecipientRecord from './pages/RecipientRecord';
import RecipientSearch from './pages/RecipientSearch';
import AppWrapper from './components/AppWrapper';
import AccountManagement from './pages/AccountManagement';
import MyGroups from './pages/AccountManagement/MyGroups';
import Logout from './pages/Logout';
import MyGroupsProvider from './components/MyGroupsProvider';
import ScrollToTop from './components/ScrollToTop';
import RegionalGoalDashboard from './pages/RegionalGoalDashboard';
import NotificationsPage from './pages/Notifications';
import TrainingReportForm from './pages/TrainingReportForm';
import Group from './pages/AccountManagement/Group';
import SessionForm from './pages/SessionForm';
import ViewTrainingReport from './pages/ViewTrainingReport';
import QADashboard from './pages/QADashboard';
import SomethingWentWrong from './components/SomethingWentWrong';
import NewVersionAvailable from './components/NewVersionAvailable';
import RecipientsWithNoTta from './pages/QADashboard/RecipientsWithNoTta';
import RecipientsWithClassScoresAndGoals from './pages/QADashboard/RecipientsWithClassScoresAndGoals';
import RecipientsWithOhsStandardFeiGoal from './pages/QADashboard/RecipientsWithOhsStandardFeiGoal';
import RegionalCommunicationLog from './pages/RegionalCommunicationLog';
import RegionalCommunicationLogDashboard from './pages/RegionalCommunicationLogDashboard';
import ViewRegionalCommunicationLog from './pages/RegionalCommunicationLog/ViewRegionalCommunicationLog';
import SubmittedActivityReport from './pages/SubmittedActivityReport';
import ViewCollabReport from './pages/ViewCollabReport';

export default function Routes({
  alert,
  logout,
  announce,
  user,
  authenticated,
  areThereUnreadNotifications,
  setAreThereUnreadNotifications,
  authError,
  updateUser,
  loggedOut,
  timedOut,
  notifications,
}) {
  const admin = isAdmin(user);
  const hasTrainingReportDashboard = canSeeBehindFeatureFlag(user, 'training_reports_dashboard');

  const locationRef = useLocation();

  const hideSideNav = (pathname) => {
    const paths = [
      'something-went-wrong',
    ];

    return paths.some((path) => pathname.includes(path));
  };

  const renderAuthenticatedRoutes = () => (
    <>
      <Switch>
        <Route
          path="/activity-reports/revision-change"
          render={() => (
            <AppWrapper hasAlerts={false} authenticated logout={logout}>
              <NewVersionAvailable />
            </AppWrapper>
          )}
        />
        <Route
          path="/something-went-wrong/:errorResponseCode([0-9]*)"
          render={({ match }) => (
            <AppWrapper hasAlerts={false} authenticated logout={logout}>
              <SomethingWentWrong responseCode={match.params.errorResponseCode} />
            </AppWrapper>
          )}
        />
        <Route
          path="/activity-reports/legacy/:legacyId([0-9RA\-]*)"
          render={({ match }) => (
            <AppWrapper authenticated logout={logout} hasAlerts={!!(alert)}>
              <LegacyReport
                match={match}
              />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/activity-reports"
          render={({ match }) => (
            <AppWrapper hasAlerts={!!(alert)} authenticated logout={logout}>
              <LandingLayout>
                <Landing match={match} />
              </LandingLayout>
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/collaboration-reports"
          render={({ match }) => (
            <AppWrapper hasAlerts={!!(alert)} authenticated logout={logout}>
              <FeatureFlag flag="collaboration_report" renderNotFound>
                <CollaborationReportsLanding match={match} />
              </FeatureFlag>
            </AppWrapper>
          )}
        />
        <Route
          path="/collaboration-reports/view/:collabReportId(new|[0-9]*)"
          render={({ match }) => (
            <AppWrapper authenticated logout={logout} hasAlerts={!!(alert)}>
              <FeatureFlag flag="collaboration_report" renderNotFound>
                <ViewCollabReport match={match} />
              </FeatureFlag>
            </AppWrapper>
          )}
        />
        <Route
          path="/collaboration-reports/:collabReportId(new|[0-9]*)/:currentPage([a-z\-]*)?"
          render={({ match, location }) => (
            <AppWrapper authenticated logout={logout} hasAlerts={!!(alert)}>
              <FeatureFlag flag="collaboration_report" renderNotFound>
                <CollaborationReport location={location} match={match} />
              </FeatureFlag>
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/"
          render={() => (
            <AppWrapper hasAlerts={!!(alert)} authenticated logout={logout}>
              <Home />
            </AppWrapper>
          )}
        />
        <Route
          path="/activity-reports/submitted/:activityReportId([0-9]*)"
          render={({ match, location }) => (
            <AppWrapper authenticated logout={logout} hasAlerts={!!(alert)}>
              <SubmittedActivityReport location={location} match={match} user={user} />
            </AppWrapper>
          )}
        />
        <Route
          path="/activity-reports/view/:activityReportId([0-9]*)"
          render={({ match, location }) => (
            <AppWrapper authenticated logout={logout} hasAlerts={!!(alert)}>
              <ApprovedActivityReport location={location} match={match} user={user} />
            </AppWrapper>
          )}
        />
        <Route
          path="/activity-reports/:activityReportId(new|[0-9]*)/:currentPage([a-z\-]*)?"
          render={({ match, location }) => (
            <AppWrapper authenticated logout={logout} hasAlerts={!!(alert)}>
              <ActivityReport location={location} match={match} />
            </AppWrapper>
          )}
        />
        <Route
          path="/recipient-tta-records/:recipientId([0-9]*)/region/:regionId([0-9]*)"
          render={({ match, location }) => (
            <AppWrapper authenticated logout={logout} padded={false} hasAlerts={!!(alert)}>
              <RecipientRecord
                location={location}
                match={match}
                user={user}
                hasAlerts={!!(alert)}
              />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/dashboards/resources-dashboard"
          render={() => (
            <AppWrapper authenticated logout={logout}>
              <ResourcesDashboard user={user} />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/dashboards/ipd-courses"
          render={() => (
            <AppWrapper authenticated logout={logout}>
              <CourseDashboard />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/dashboards/qa-dashboard/recipients-with-no-tta"
          render={() => (
            <AppWrapper authenticated logout={logout}>
              <RecipientsWithNoTta />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/dashboards/qa-dashboard/recipients-with-ohs-standard-fei-goal"
          render={() => (
            <AppWrapper authenticated logout={logout}>
              <RecipientsWithOhsStandardFeiGoal />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/dashboards/qa-dashboard/recipients-with-class-scores-and-goals"
          render={() => (
            <AppWrapper authenticated logout={logout}>
              <RecipientsWithClassScoresAndGoals />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/training-reports/:status(not-started|in-progress|complete|suspended)"
          render={({ match }) => (
            <AppWrapper authenticated logout={logout}>
              <TrainingReports user={user} match={match} />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/training-report/view/:trainingReportId([0-9RT\-]*)"
          render={({ match }) => (
            <AppWrapper authenticated logout={logout}>
              <ViewTrainingReport match={match} />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/training-report/:trainingReportId([0-9RT\-]*)/:currentPage([a-z\-]*)?"
          render={({ match }) => (
            <AppWrapper authenticated logout={logout}>
              <TrainingReportForm match={match} />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/training-report/:trainingReportId([0-9RT\-]*)/session/:sessionId(new|[0-9]*)/:currentPage([a-z\-]*)?"
          render={({ match }) => (
            <AppWrapper authenticated logout={logout}>
              <SessionForm match={match} />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/dashboards/qa-dashboard"
          render={() => (
            <FeatureFlag
              renderNotFound
              flag="quality_assurance_dashboard"
            >
              <AppWrapper
                authenticated
                logout={logout}
                hasAlerts={!!(alert)}
              >
                <QADashboard />
              </AppWrapper>
            </FeatureFlag>
          )}
        />
        <Route
          exact
          path="/dashboards/regional-dashboard/activity-reports"
          render={({ match }) => (
            <AppWrapper
              padded={!(hasTrainingReportDashboard)}
              authenticated
              logout={logout}
              hasAlerts={!!(alert)}
            >
              <RegionalDashboard match={match} />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/dashboards/regional-dashboard/:reportType(training-reports|all-reports)"
          render={({ match }) => (
            <AppWrapper padded={false} authenticated logout={logout} hasAlerts={!!(alert)}>
              <FeatureFlag flag="training_reports_dashboard" renderNotFound>
                <RegionalDashboard match={match} />
              </FeatureFlag>
            </AppWrapper>
          )}
        />
        <Route
          path="/account/my-groups/:groupId([0-9]*)"
          render={({ match }) => (
            <AppWrapper authenticated logout={logout}>
              <MyGroups match={match} />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/account/my-groups"
          render={({ match }) => (
            <AppWrapper authenticated logout={logout}>
              <MyGroups match={match} />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/account/group/:groupId([0-9]*)"
          render={({ match }) => (
            <AppWrapper authenticated logout={logout}>
              <Group match={match} />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/regional-goal-dashboard"
          render={() => (
            <AppWrapper authenticated logout={logout}>
              <FeatureFlag flag="regional_goal_dashboard" renderNotFound>
                <RegionalGoalDashboard user={user} />
              </FeatureFlag>
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/communication-log"
          render={() => (
            <AppWrapper authenticated logout={logout} hasAlerts={!!(alert)}>
              <RegionalCommunicationLogDashboard />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/account"
          render={() => (
            <AppWrapper authenticated logout={logout} hasAlerts={!!(alert)}>
              <AccountManagement updateUser={updateUser} />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/notifications"
          render={() => (
            <AppWrapper authenticated logout={logout} hasAlerts={!!(alert)}>
              <NotificationsPage notifications={notifications} />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/account/verify-email/:token"
          render={() => (
            <AppWrapper authenticated logout={logout} hasAlerts={!!(alert)}>
              <AccountManagement updateUser={updateUser} />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/logout"
          render={() => <Logout />}
        />
        {admin && (
          <Route
            path="/admin"
            render={() => (
              <AppWrapper authenticated logout={logout} hasAlerts={!!(alert)}><Admin /></AppWrapper>
            )}
          />
        )}
        <Route
          exact
          path="/recipient-tta-records"
          render={() => (
            <AppWrapper authenticated logout={logout} hasAlerts={!!(alert)}>
              <RecipientSearch user={user} />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/communication-log/region/:regionId/log/:logId/view"
          render={({ match }) => (
            <AppWrapper authenticated logout={logout} hasAlerts={!!(alert)}>
              <ViewRegionalCommunicationLog match={match} />
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/communication-log/region/:regionId/log/:logId/:currentPage?"
          render={() => (
            <AppWrapper authenticated logout={logout} hasAlerts={!!(alert)}>
              <RegionalCommunicationLog />
            </AppWrapper>
          )}
        />
        <Route
          render={() => (
            <Redirect to="/something-went-wrong/404" />
          )}
        />
      </Switch>
    </>
  );

  return (
    <>
      <ScrollToTop />
      {(authenticated && !hideSideNav(locationRef.pathname)) && (
      <>
        <a className="usa-skipnav" href="#main-content">
          Skip to main content
        </a>

        {/* Only show the sidebar when the user is authenticated */}
        <UserContext.Provider value={{ user, authenticated, logout }}>
          <SiteNav
            admin={admin}
            authenticated={authenticated}
            logout={logout}
            user={user}
            hasAlerts={!!(alert)}
          />
        </UserContext.Provider>
      </>
      )}
      <AriaLiveContext.Provider value={{ announce }}>
        <MyGroupsProvider authenticated={authenticated}>
          <UserContext.Provider value={{ user, authenticated, logout }}>
            <Header
              authenticated
              alert={alert}
              areThereUnreadNotifications={areThereUnreadNotifications}
              setAreThereUnreadNotifications={setAreThereUnreadNotifications}
            />
            {!authenticated && (authError === 403
              ? <AppWrapper logout={logout}><RequestPermissions /></AppWrapper>
              : (
                <AppWrapper padded={false} logout={logout}>
                  <Unauthenticated loggedOut={loggedOut} timedOut={timedOut} />
                </AppWrapper>
              )
            )}
            {authenticated && renderAuthenticatedRoutes()}
          </UserContext.Provider>
        </MyGroupsProvider>
      </AriaLiveContext.Provider>
    </>
  );
}
Routes.propTypes = {
  alert: PropTypes.shape({
    id: PropTypes.number,
    title: PropTypes.string,
    message: PropTypes.string,
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    status: PropTypes.string,
    variant: PropTypes.string,
    size: PropTypes.string,
  }),
  logout: PropTypes.func.isRequired,
  announce: PropTypes.func.isRequired,
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
  }),
  authenticated: PropTypes.bool.isRequired,
  areThereUnreadNotifications: PropTypes.bool.isRequired,
  setAreThereUnreadNotifications: PropTypes.func.isRequired,
  authError: PropTypes.number,
  updateUser: PropTypes.func.isRequired,
  loggedOut: PropTypes.bool,
  timedOut: PropTypes.bool,
  notifications: PropTypes.shape({
    whatsNew: PropTypes.oneOfType([
      PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.number,
          title: PropTypes.string,
          message: PropTypes.string,
        }),
      ),
      PropTypes.string, // Sometimes an HTML string
    ]),
  }),
};

Routes.defaultProps = {
  alert: null,
  user: null,
  authError: null,
  loggedOut: false,
  timedOut: false,
  notifications: null,
};
