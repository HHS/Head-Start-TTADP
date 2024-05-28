import React from 'react';
import { Routes, Route } from 'react-router';
import { NavLink } from 'react-router-dom';
import User from './users';
import Cdi from './cdi';
import Diag from './diag';
import Flags from './Flags';
import SiteAlerts from './SiteAlerts';
import Redis from './Redis';
import NationalCenters from './NationalCenters';
import Goals from './Goals';
import TrainingReports from './TrainingReports';
import Courses from './Courses';

function Admin() {
  return (
    <>
      <h1>Admin</h1>
      <h2>Support</h2>
      <div className="margin-bottom-2">
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/cdi">
          CDI grants
        </NavLink>
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/courses">
          Courses
        </NavLink>
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/diag">
          Diag
        </NavLink>
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/goals">
          Goals
        </NavLink>
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/flags">
          Feature flags
        </NavLink>
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/national-centers">
          National centers
        </NavLink>
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/site-alerts">
          Site alerts
        </NavLink>
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/training-reports">
          Training Reports
        </NavLink>
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/users">
          Users
        </NavLink>
      </div>
      <h2>Engineer only</h2>
      <div className="margin-bottom-2">
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/redis">
          Redis info
        </NavLink>
      </div>
      <Routes>
        <Route
          path="/admin/cdi/:grantId?"
          element={({ match }) => <Cdi match={match} />}
        />
        <Route
          path="/admin/users/:userId?"
          element={({ match }) => <User match={match} />}
        />
        <Route
          path="/admin/diag/"
          element={({ match }) => <Diag match={match} />}
        />
        <Route
          path="/admin/flags/"
          element={({ match }) => <Flags match={match} />}
        />
        <Route
          path="/admin/site-alerts/"
          element={({ match }) => <SiteAlerts match={match} />}
        />
        <Route
          path="/admin/redis/"
          element={({ match }) => <Redis match={match} />}
        />
        <Route
          path="/admin/national-centers/:nationalCenterId?"
          element={({ match }) => <NationalCenters match={match} />}
        />
        <Route
          path="/admin/goals/"
          render={() => <Goals />}
        />
        <Route
          path="/admin/training-reports/"
          element={({ match }) => <TrainingReports match={match} />}
        />
        <Route
          path="/admin/courses/"
          element={({ match }) => <Courses match={match} />}
        />
      </Routes>
    </>
  );
}

export default Admin;
