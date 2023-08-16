import React from 'react';
import { Switch, Route } from 'react-router';
import { NavLink } from 'react-router-dom';

import User from './users';
import Cdi from './cdi';
import Diag from './diag';
import Flags from './Flags';
import SiteAlerts from './SiteAlerts';
import Redis from './Redis';
import NationalCenters from './NationalCenters';
import Email from './Email';

function Admin() {
  return (
    <>
      <h1>Admin UI</h1>
      <div className="margin-bottom-2">
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/cdi">
          CDI grants
        </NavLink>
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/users">
          Users
        </NavLink>
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/diag">
          Diag
        </NavLink>
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/flags">
          Feature flags
        </NavLink>
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/site-alerts">
          Site alerts
        </NavLink>
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/redis">
          Redis info
        </NavLink>
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/national-centers">
          National centers
        </NavLink>
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/email">
          Email
        </NavLink>
      </div>
      <Switch>
        <Route
          path="/admin/cdi/:grantId?"
          render={({ match }) => <Cdi match={match} />}
        />
        <Route
          path="/admin/users/:userId?"
          render={({ match }) => <User match={match} />}
        />
        <Route
          path="/admin/diag/"
          render={({ match }) => <Diag match={match} />}
        />
        <Route
          path="/admin/flags/"
          render={({ match }) => <Flags match={match} />}
        />
        <Route
          path="/admin/site-alerts/"
          render={({ match }) => <SiteAlerts match={match} />}
        />
        <Route
          path="/admin/redis/"
          render={({ match }) => <Redis match={match} />}
        />
        <Route
          path="/admin/national-centers/:nationalCenterId?"
          render={({ match }) => <NationalCenters match={match} />}
        />
        <Route
          path="/admin/email/"
          render={({ match }) => <Email match={match} />}
        />
      </Switch>
    </>
  );
}

export default Admin;
