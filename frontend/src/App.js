import React, { useState, useEffect } from 'react';
import 'uswds/dist/css/uswds.css';
import '@trussworks/react-uswds/lib/index.css';

import { BrowserRouter, Route } from 'react-router-dom';
import { GridContainer } from '@trussworks/react-uswds';

import { fetchUser, fetchLogout } from './fetchers/Auth';

import UserContext from './UserContext';
import Header from './components/Header';
import Page from './pages';
import Admin from './pages/Admin';
import Unauthenticated from './pages/Unauthenticated';
import Home from './pages/Home';
import ActivityReport from './pages/ActivityReport';
import './App.css';

function App() {
  const [user, updateUser] = useState();
  const [loading, updateLoading] = useState(true);
  const [loggedOut, updateLoggedOut] = useState(false);
  const authenticated = user !== undefined;

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

  const logout = async () => {
    await fetchLogout();
    updateUser();
    updateLoggedOut(true);
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
        && <Unauthenticated loggedOut={loggedOut} />}
            {authenticated
        && renderAuthenticatedRoutes()}
          </GridContainer>
        </section>
      </UserContext.Provider>
    </BrowserRouter>
  );
}

export default App;
