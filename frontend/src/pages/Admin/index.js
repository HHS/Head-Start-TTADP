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
        <NavLink className="usa-button" to="/admin/cdi">
          CDI grants
        </NavLink>
        <NavLink className="usa-button" to="/admin/courses">
          Courses
        </NavLink>
        <NavLink className="usa-button" to="/admin/diag">
          Diag
        </NavLink>
        <NavLink className="usa-button" to="/admin/goals">
          Goals
        </NavLink>
        <NavLink className="usa-button" to="/admin/flags">
          Feature flags
        </NavLink>
        <NavLink className="usa-button" to="/admin/national-centers">
          National centers
        </NavLink>
        <NavLink className="usa-button" to="/admin/site-alerts">
          Site alerts
        </NavLink>
        <NavLink className="usa-button" to="/admin/training-reports">
          Training Reports
        </NavLink>
        <NavLink className="usa-button" to="/admin/users">
          Users
        </NavLink>
        <NavLink className="usa-button" to="/admin/ss">
          SS
        </NavLink>
      </div>
      <h2>Engineer only</h2>
      <div className="margin-bottom-2">
        <NavLink className="usa-button" to="/admin/redis">
          Redis info
        </NavLink>
      </div>
      <Routes>
        <Route
          path="cdi/:grantId?"
          element={<Cdi />}
        />
        <Route
          path="users/:userId?"
          element={<User />}
        />
        <Route
          path="ss"
          element={<SS />}
        />
        <Route
          path="diag"
          element={<Diag />}
        />
        <Route
          path="flags"
          element={<Flags />}
        />
        <Route
          path="site-alerts"
          element={<SiteAlerts />}
        />
        <Route
          path="redis"
          element={<Redis />}
        />
        <Route
          path="national-centers/:nationalCenterId?"
          element={<NationalCenters />}
        />
        <Route
          path="goals/*"
          element={<Goals />}
        />
        <Route
          path="training-reports"
          element={<TrainingReports />}
        />
        <Route
          path="courses"
          element={<Courses />}
        />
      </Routes>
    </>
  );
}

export default Admin;
