import React, { useState, useEffect } from 'react';
import 'uswds/dist/css/uswds.css';
import '@trussworks/react-uswds/lib/index.css';

import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { Helmet } from 'react-helmet';

import { fetchUser, fetchLogout } from './fetchers/Auth';

import UserContext from './UserContext';
import Header from './components/Header';
import IdleModal from './components/IdleModal';
import Admin from './pages/Admin';
import Unauthenticated from './pages/Unauthenticated';
import NotFound from './pages/NotFound';
import Home from './pages/Home';
import Landing from './pages/Landing';
import ActivityReport from './pages/ActivityReport';
import isAdmin from './permissions';
import 'react-dates/initialize';
import 'react-dates/lib/css/_datepicker.css';
import './App.css';
import MainLayout from './components/MainLayout';
import LandingLayout from './components/LandingLayout';

function App() {
  const [user, updateUser] = useState();
  const [loading, updateLoading] = useState(true);
  const [loggedOut, updateLoggedOut] = useState(false);
  const authenticated = user !== undefined;
  const [timedOut, updateTimedOut] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const u = await fetchUser();
        updateUser(u);
      } catch (e) {
        updateUser();
      } finally {
        updateLoading(false);
      }
    };
    fetchData();
  }, []);

  const logout = async (timeout = false) => {
    await fetchLogout();
    updateUser();
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
          exact
          path="/activity-reports"
          render={({ match }) => (
            <LandingLayout><Landing match={match} user={user}/></LandingLayout>
          )}
        />

        <Route
          exact
          path="/"
          render={() => (
            <MainLayout><Home /></MainLayout>
          )}
        />

        <Route
          path="/activity-reports/:activityReportId/:currentPage?"
          render={({ match, location }) => (
            <MainLayout>
              <ActivityReport location={location} match={match} user={user} />
            </MainLayout>
          )}
        />

        {admin && (
          <Route
            path="/admin/:userId?"
            render={({ match }) => <MainLayout><Admin match={match} /></MainLayout>}
          />
        )}

        <Route
          render={() => <MainLayout><NotFound /></MainLayout>}
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
          <Header authenticated={authenticated} admin={admin} />
          <div className="background-stripe" />
          <section className="usa-section">

            {!authenticated && (
            <Unauthenticated loggedOut={loggedOut} timedOut={timedOut} />
            )}
            {authenticated && renderAuthenticatedRoutes()}

          </section>
        </UserContext.Provider>
      </BrowserRouter>
    </>
  );
}

export default App;
