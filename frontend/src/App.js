import React, { useState, useEffect } from 'react';
import 'uswds/dist/css/uswds.css';
import '@trussworks/react-uswds/lib/index.css';

import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { Helmet } from 'react-helmet';

import { fetchUser, fetchLogout } from './fetchers/Auth';
import { HTTPError } from './fetchers';

import UserContext from './UserContext';
import SiteNav from './components/SiteNav';
import Header from './components/Header';

import Admin from './pages/Admin';
import RegionalDashboard from './pages/RegionalDashboard';
import Unauthenticated from './pages/Unauthenticated';
import NotFound from './pages/NotFound';
import Home from './pages/Home';
import Landing from './pages/Landing';
import ActivityReport from './pages/ActivityReport';
import LegacyReport from './pages/LegacyReport';
import isAdmin from './permissions';
import 'react-dates/initialize';
import 'react-dates/lib/css/_datepicker.css';
import './App.css';
import LandingLayout from './components/LandingLayout';
import RequestPermissions from './components/RequestPermissions';
import AriaLiveContext from './AriaLiveContext';
import AriaLiveRegion from './components/AriaLiveRegion';
import FeatureFlag from './components/FeatureFlag';
import ApprovedActivityReport from './pages/ApprovedActivityReport';
import GranteeRecord from './pages/GranteeRecord';
import GranteeSearch from './pages/GranteeSearch';
import AppWrapper from './components/AppWrapper';

function App() {
  const [user, updateUser] = useState();
  const [authError, updateAuthError] = useState();
  const [loading, updateLoading] = useState(true);
  const [loggedOut, updateLoggedOut] = useState(false);
  const authenticated = user !== undefined;
  const [timedOut, updateTimedOut] = useState(false);
  const [announcements, updateAnnouncements] = useState([]);

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
        updateLoading(false);
      }
    };
    fetchData();
  }, []);

  const logout = async (timeout = false) => {
    await fetchLogout();
    updateUser();
    updateAuthError();
    updateLoggedOut(true);
    updateTimedOut(timeout);
  };

  const announce = (message) => {
    updateAnnouncements([...announcements, message]);
  };

  if (loading) {
    return (
      <div>
        Loading...
      </div>
    );
  }

  const admin = isAdmin(user);

  const renderAuthenticatedRoutes = () => (
    <>
      <Switch>
        <Route
          path="/activity-reports/legacy/:legacyId([0-9RA\-]*)"
          render={({ match }) => (
            <AppWrapper authenticated logout={logout}>
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
            <AppWrapper authenticated logout={logout}>
              <LandingLayout><Landing match={match} user={user} /></LandingLayout>
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/"
          render={() => <AppWrapper authenticated logout={logout}><Home /></AppWrapper>}
        />
        <Route
          path="/activity-reports/view/:activityReportId([0-9]*)"
          render={({ match, location }) => (
            <AppWrapper authenticated logout={logout}>
              <ApprovedActivityReport location={location} match={match} user={user} />
            </AppWrapper>
          )}
        />
        <Route
          path="/activity-reports/:activityReportId(new|[0-9]*)/:currentPage([a-z\-]*)?"
          render={({ match, location }) => (
            <AppWrapper authenticated logout={logout}>
              <ActivityReport location={location} match={match} user={user} />
            </AppWrapper>
          )}
        />
        <Route
          path="/grantee/:granteeId([0-9]*)"
          render={({ match, location }) => (
            <AppWrapper authenticated logout={logout} padded={false}>
              <FeatureFlag user={user} flag="grantee_record_page" admin={admin} renderNotFound>
                <GranteeRecord location={location} match={match} user={user} />
              </FeatureFlag>
            </AppWrapper>
          )}
        />
        <Route
          exact
          path="/regional-dashboard"
          render={() => (
            <AppWrapper authenticated logout={logout}><RegionalDashboard user={user} /></AppWrapper>
          )}
        />
        {admin && (
        <Route
          path="/admin"
          render={() => (
            <AppWrapper authenticated logout={logout}><Admin /></AppWrapper>
          )}
        />
        )}
        <Route
          exact
          path="/grantees"
          render={() => (
            <AppWrapper authenticated logout={logout}>
              <FeatureFlag user={user} flag="grantee_record_page" admin={admin} renderNotFound><GranteeSearch user={user} /></FeatureFlag>
            </AppWrapper>
          )}
        />
        <Route
          render={() => <AppWrapper authenticated logout={logout}><NotFound /></AppWrapper>}
        />
      </Switch>
    </>
  );

  return (
    <>
      <Helmet titleTemplate="%s - TTA Hub" defaultTitle="TTA Hub">
        <meta charSet="utf-8" />
        <script src="https://touchpoints.app.cloud.gov/touchpoints/7d519b5e.js" async />
      </Helmet>
      <BrowserRouter>
        {authenticated && (
          <a className="usa-skipnav" href="#main-content">
            Skip to main content
          </a>
        )}
        <UserContext.Provider value={{ user, authenticated, logout }}>
          <Header />
          <AriaLiveContext.Provider value={{ announce }}>
            <SiteNav admin={admin} authenticated={authenticated} logout={logout} user={user} />

            {!authenticated && (authError === 403
              ? <AppWrapper><RequestPermissions /></AppWrapper>
              : (
                <AppWrapper>
                  <Unauthenticated loggedOut={loggedOut} timedOut={timedOut} />
                </AppWrapper>
              )
            )}
            {authenticated && renderAuthenticatedRoutes()}

          </AriaLiveContext.Provider>
        </UserContext.Provider>
      </BrowserRouter>
      <AriaLiveRegion messages={announcements} />
    </>
  );
}

export default App;
