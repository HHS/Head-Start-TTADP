import React from 'react';
import { Switch, Route } from 'react-router';
import { NavLink } from 'react-router-dom';

import User from './users';
import Cdi from './cdi';
import Diag from './diag';
import Flags from './Flags';
import RoleManagement from './RoleManagement';
import SiteAlerts from './SiteAlerts';

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
          path="/admin/roles/"
          render={({ match }) => <RoleManagement match={match} />}
        />
      </Switch>
    </>
  );
}

export default Admin;
