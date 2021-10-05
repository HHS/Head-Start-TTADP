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
import IdleModal from './components/IdleModal';
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
    <div role="main" id="main-content">
      <IdleModal
        modalTimeout={Number(process.env.REACT_APP_INACTIVE_MODAL_TIMEOUT)}
        logoutTimeout={Number(process.env.REACT_APP_SESSION_TIMEOUT)}
        logoutUser={logout}
      />
      <Switch>

        <Route
          path="/activity-reports/legacy/:legacyId([0-9RA\-]*)"
          render={({ match }) => (
            <LegacyReport
              match={match}
            />
          )}
        />
        <Route
          exact
          path="/activity-reports"
          render={({ match }) => (
            <LandingLayout><Landing match={match} user={user} /></LandingLayout>
          )}
        />
        <Route
          exact
          path="/"
          render={() => <Home />}
        />
        <Route
          path="/activity-reports/view/:activityReportId([0-9]*)"
          render={({ match, location }) => (
            <ApprovedActivityReport location={location} match={match} user={user} />
          )}
        />
        <Route
          path="/activity-reports/:activityReportId(new|[0-9]*)/:currentPage([a-z\-]*)?"
          render={({ match, location }) => (
            <ActivityReport location={location} match={match} user={user} />
          )}
        />
        <Route
          path="/region/:regionId([0-9]*)/grantee/:granteeId([0-9]*)"
          render={({ match }) => (
            <FeatureFlag user={user} flag="grantee_record_page" admin={admin} renderNotFound><GranteeRecord match={match} user={user} /></FeatureFlag>
          )}
        />
        <Route
          exact
          path="/regional-dashboard"
          render={() => (
            <RegionalDashboard user={user} />
          )}
        />
        {admin && (
        <Route
          path="/admin"
          render={() => (
            <Admin />
          )}
        />
        )}
        <Route
          render={() => <NotFound />}
        />
      </Switch>
    </div>
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
            <div className="grid-row maxw-widescreen flex-align-start smart-hub-offset-nav tablet:smart-hub-offset-nav desktop:smart-hub-offset-nav margin-top-9 margin-right-5">
              <div className="grid-col-12 margin-top-2 margin-right-2 margin-left-3">
                <section className="usa-section padding-top-3">
                  {!authenticated && (authError === 403
                    ? <RequestPermissions />
                    : <Unauthenticated loggedOut={loggedOut} timedOut={timedOut} />
                  )}
                  {authenticated && renderAuthenticatedRoutes()}
                </section>
              </div>
            </div>
          </AriaLiveContext.Provider>
        </UserContext.Provider>
      </BrowserRouter>
      <AriaLiveRegion messages={announcements} />
    </>
  );
}

export default App;
