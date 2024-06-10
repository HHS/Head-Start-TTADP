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
import SS from './SS';
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
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/ss">
          SS
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
          element={<Cdi />}
        />
        <Route
          path="/admin/users/:userId?"
          element={<User />}
        />
        <Route
          path="/admin/ss/"
          render={({ match }) => <SS match={match} />}
        />
        <Route
          path="/admin/diag/"
          element={<Diag />}
        />
        <Route
          path="/admin/flags/"
          element={<Flags />}
        />
        <Route
          path="/admin/site-alerts/"
          element={<SiteAlerts />}
        />
        <Route
          path="/admin/redis/"
          element={<Redis />}
        />
        <Route
          path="/admin/national-centers/:nationalCenterId?"
          element={<NationalCenters />}
        />
        <Route
          path="/admin/goals/"
          render={<Goals />}
        />
        <Route
          path="/admin/training-reports/"
          element={<TrainingReports />}
        />
        <Route
          path="/admin/courses/"
          element={<Courses />}
        />
      </Routes>
    </>
  );
}

export default Admin;
