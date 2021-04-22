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

function App() {
  const [user, updateUser] = useState();
  const [authError, updateAuthError] = useState();
  const [loading, updateLoading] = useState(true);
  const [loggedOut, updateLoggedOut] = useState(false);
  const authenticated = user !== undefined;
  const [timedOut, updateTimedOut] = useState(false);

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
          path="/activity-reports/legacy/:legacyId"
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
            <LandingLayout><Landing match={match} /></LandingLayout>
          )}
        />
        <Route
          exact
          path="/"
          render={() => (
            <Home />
          )}
        />
        <Route
          path="/activity-reports/:activityReportId/:currentPage?"
          render={({ match, location }) => (
            <ActivityReport location={location} match={match} user={user} />
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
      <Helmet titleTemplate="%s - TTA Smart Hub" defaultTitle="TTA Smart Hub">
        <meta charSet="utf-8" />
      </Helmet>
      <BrowserRouter>
        {authenticated && (
          <a className="usa-skipnav" href="#main-content">
            Skip to main content
          </a>
        )}
        <UserContext.Provider value={{ user, authenticated, logout }}>
          <Header />
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
        </UserContext.Provider>
      </BrowserRouter>
    </>
  );
}

export default App;
