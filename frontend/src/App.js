import React, { useState, useEffect } from 'react';
import 'uswds/dist/css/uswds.css';
import '@trussworks/react-uswds/lib/index.css';

import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { GridContainer } from '@trussworks/react-uswds';

import { fetchUser, fetchLogout } from './fetchers/Auth';

import UserContext from './UserContext';
import Header from './components/Header';
import IdleModal from './components/IdleModal';
import Page from './pages';
import Admin from './pages/Admin';
import Unauthenticated from './pages/Unauthenticated';
import NotFound from './pages/NotFound';
import Home from './pages/Home';
import ActivityReport from './pages/ActivityReport';
import './App.css';

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
          path="/"
          render={() => (
            <Page title="TTA Smart Hub">
              <Home />
            </Page>
          )}
        />
        <Route
          path="/admin/:userId?"
          render={({ match }) => (
            <Page title="User Administration">
              <Admin match={match} />
            </Page>
          )}
        />
        <Route
          path="/activity-reports"
          render={() => (
            <Page title="Activity Reports">
              <ActivityReport />
            </Page>
          )}
        />
        <Route
          render={() => (
            <Page title="Not Found">
              <NotFound />
            </Page>
          )}
        />
      </Switch>
    </div>
  );

  return (
    <BrowserRouter>
      {authenticated && <a className="usa-skipnav" href="#main-content">Skip to main content</a>}
      <UserContext.Provider value={{ user, authenticated, logout }}>
        <Header authenticated={authenticated} />
        <div className="background-stripe" />
        <section className="usa-section">
          <GridContainer>
            {!authenticated
        && <Unauthenticated loggedOut={loggedOut} timedOut={timedOut} />}
            {authenticated
        && renderAuthenticatedRoutes()}
          </GridContainer>
        </section>
      </UserContext.Provider>
    </BrowserRouter>
  );
}

export default App;
