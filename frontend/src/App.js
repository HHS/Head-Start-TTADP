import React, { useState, useEffect, useMemo } from 'react';
import '@trussworks/react-uswds/lib/uswds.css';
import '@trussworks/react-uswds/lib/index.css';

import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { Helmet } from 'react-helmet';

import { fetchUser, fetchLogout } from './fetchers/Auth';
import { HTTPError } from './fetchers';
import { getSiteAlerts } from './fetchers/siteAlerts';
import FeatureFlag from './components/FeatureFlag';
import UserContext from './UserContext';
import SiteNav from './components/SiteNav';
import Header from './components/Header';

import Admin from './pages/Admin';
import RegionalDashboard from './pages/RegionalDashboard';
import TrainingReports from './pages/TrainingReports';
import ResourcesDashboard from './pages/ResourcesDashboard';
import Unauthenticated from './pages/Unauthenticated';
import NotFound from './pages/NotFound';
import Home from './pages/Home';
import Landing from './pages/Landing';
import ActivityReport from './pages/ActivityReport';
import LegacyReport from './pages/LegacyReport';
import isAdmin, { canSeeBehindFeatureFlag } from './permissions';
import './App.scss';
import LandingLayout from './components/LandingLayout';
import RequestPermissions from './components/RequestPermissions';
import AriaLiveContext from './AriaLiveContext';
import AriaLiveRegion from './components/AriaLiveRegion';
import ApprovedActivityReport from './pages/ApprovedActivityReport';
import RecipientRecord from './pages/RecipientRecord';
import RecipientSearch from './pages/RecipientSearch';
import AppWrapper from './components/AppWrapper';
import AccountManagement from './pages/AccountManagement';
import MyGroups from './pages/AccountManagement/MyGroups';
import Logout from './pages/Logout';

import { getReportsForLocalStorageCleanup } from './fetchers/activityReports';
import { getNotifications } from './fetchers/feed';
import { storageAvailable } from './hooks/helpers';
import {
  LOCAL_STORAGE_DATA_KEY,
  LOCAL_STORAGE_ADDITIONAL_DATA_KEY,
  LOCAL_STORAGE_EDITABLE_KEY,
} from './Constants';
import AppLoadingContext from './AppLoadingContext';
import MyGroupsProvider from './components/MyGroupsProvider';
import ScrollToTop from './components/ScrollToTop';
import Loader from './components/Loader';
import RegionalGoalDashboard from './pages/RegionalGoalDashboard';
import NotificationsPage from './pages/Notifications';
import TrainingReportForm from './pages/TrainingReportForm';
import Group from './pages/AccountManagement/Group';
import SessionForm from './pages/SessionForm';
import ViewTrainingReport from './pages/ViewTrainingReport';
import useGaUserData from './hooks/useGaUserData';
import QADashboard from './pages/QADashboard';

const WHATSNEW_NOTIFICATIONS_KEY = 'whatsnew-read-notifications';

function App() {
  const [user, updateUser] = useState();
  const [landingLoading, setLandingLoading] = useState(true);
  const [authError, updateAuthError] = useState();
  const [loggedOut, updateLoggedOut] = useState(false);
  const authenticated = useMemo(() => user !== undefined, [user]);
  const localStorageAvailable = useMemo(() => storageAvailable('localStorage'), []);
  const [timedOut, updateTimedOut] = useState(false);
  const [announcements, updateAnnouncements] = useState([]);
  const [isAppLoading, setIsAppLoading] = useState(false);
  const [appLoadingText, setAppLoadingText] = useState('Loading');
  const [alert, setAlert] = useState(null);
  const [notifications, setNotifications] = useState({ whatsNew: '' });

  const [areThereUnreadNotifications, setAreThereUnreadNotifications] = useState(false);

  useGaUserData(user);

  useEffect(() => {
    try {
      const readNotifications = window.localStorage.getItem(WHATSNEW_NOTIFICATIONS_KEY) || '[]';

      if (readNotifications) {
        const parsedReadNotifications = JSON.parse(readNotifications);
        const dom = notifications.whatsNew ? new window.DOMParser().parseFromString(notifications.whatsNew, 'text/xml') : '';
        const ids = dom ? Array.from(dom.querySelectorAll('entry')).map((item) => item.querySelector('id').textContent) : [];
        const unreadNotifications = ids.filter((id) => !parsedReadNotifications.includes(id));

        setAreThereUnreadNotifications(unreadNotifications.length > 0);
      }
    } catch (err) {
      setAreThereUnreadNotifications(false);
    }
  }, [notifications]);

  useEffect(() => {
    // fetch alerts
    async function fetchAlerts() {
      try {
        const alertFromApi = await getSiteAlerts();
        setAlert(alertFromApi);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`There was an error fetching alerts: ${e}`);
      }
    }

    if (authenticated) {
      fetchAlerts();
    }
  }, [authenticated]);

  useEffect(() => {
    // fetch alerts
    async function fetchNotifications() {
      try {
        const notificationsFromApi = await getNotifications();
        setNotifications({ whatsNew: notificationsFromApi });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`There was an error fetching notifications: ${e}`);
      }
    }

    if (authenticated) {
      fetchNotifications();
    }
  }, [authenticated]);

  useEffect(() => {
    async function cleanupReports() {
      try {
        const reportsForCleanup = await getReportsForLocalStorageCleanup();
        reportsForCleanup.forEach(async (report) => {
          window.localStorage.removeItem(LOCAL_STORAGE_DATA_KEY(report.id));
          window.localStorage.removeItem(LOCAL_STORAGE_ADDITIONAL_DATA_KEY(report.id));
          window.localStorage.removeItem(LOCAL_STORAGE_EDITABLE_KEY(report.id));
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log('Error cleaning up reports', err);
      }
    }

    if (localStorageAvailable && authenticated) {
      cleanupReports();
    }
    // local storage available won't change, so this is fine.
  }, [localStorageAvailable, authenticated]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const u = await fetchUser();
        updateUser(u);
        updateAuthError();
      } catch (e) {
        updateUser();
        if (e instanceof HTTPError && e.status === 403) {
          updateAuthError(e.status);
        }
      } finally {
        setLandingLoading(false);
      }
    };
    fetchData();
  }, []);

  if (landingLoading) {
    return (
      <div>
        Loading...
      </div>
    );
  }

  const logout = async (timeout) => {
    await fetchLogout();
    updateUser();
    updateAuthError();
    updateLoggedOut(true);
    updateTimedOut(timeout);
  };

  const announce = (message) => {
    updateAnnouncements([...announcements, message]);
  };

  const admin = isAdmin(user);
  const hasTrainingReportDashboard = canSeeBehindFeatureFlag(user, 'training_reports_dashboard');

  const renderAuthenticatedRoutes = () => (
    <>
      <Switch>
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
          path="/"
          render={() => (
            <AppWrapper hasAlerts={!!(alert)} authenticated logout={logout}>
              <Home />
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
          render={() => (
            <AppWrapper hasAlerts={!!(alert)} authenticated logout={logout}>
              <NotFound />
            </AppWrapper>
          )}
        />
      </Switch>
    </>
  );

  return (
    <>
      <Helmet titleTemplate="%s | TTA Hub" defaultTitle="TTA Hub">
        <meta charSet="utf-8" />
      </Helmet>
      <Loader loading={isAppLoading} loadingLabel={`App ${appLoadingText}`} text={appLoadingText} isFixed />
      <AppLoadingContext.Provider value={{ isAppLoading, setIsAppLoading, setAppLoadingText }}>
        <BrowserRouter>
          <ScrollToTop />
          {authenticated && (
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
        </BrowserRouter>
        <AriaLiveRegion messages={announcements} />
      </AppLoadingContext.Provider>
    </>
  );
}

export default App;
