import React from 'react';
import { Switch, Route } from 'react-router';
import { NavLink } from 'react-router-dom';
import User from './users';
import Diag from './diag';
import Flags from './Flags';
import SiteAlerts from './SiteAlerts';
import Redis from './Redis';
import NationalCenters from './NationalCenters';
import Goals from './Goals';
import SS from './SS';
import TrainingReports from './TrainingReports';
import Courses from './Courses';
import CourseEdit from './CourseEdit';
import FeedPreview from './FeedPreview';
import FeedbackSurveys from './FeedbackSurveys';
import BuildInfo from '../../components/BuildInfo';

function Admin() {
  return (
    <>
      <h1 className="no-print">Admin</h1>
      <h2 className="no-print">Support</h2>
      <div className="margin-bottom-2 flex-wrap display-flex flex-gap-1 no-print">
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
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/feed-preview">
          Confluence feed preview
        </NavLink>
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/feedback-surveys">
          Feedback surveys
        </NavLink>
      </div>
      <h2 className="no-print">Engineer only</h2>
      <div className="margin-bottom-2 no-print">
        <NavLink activeClassName="usa-button--active" className="usa-button" to="/admin/redis">
          Redis info
        </NavLink>
      </div>
      <Switch>
        <Route
          path="/admin/users/:userId?"
          render={({ match }) => <User match={match} />}
        />
        <Route
          path="/admin/ss/"
          render={({ match }) => <SS match={match} />}
        />
        <Route
          path="/admin/diag/"
          render={({ match }) => (
            <Diag match={match} />
          )}
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
          path="/admin/goals/"
          render={() => <Goals />}
        />
        <Route
          path="/admin/training-reports/"
          render={({ match }) => <TrainingReports match={match} />}
        />
        <Route
          path="/admin/courses/"
          render={({ match }) => <Courses match={match} />}
        />
        <Route
          path="/admin/course/:courseId"
          render={({ match }) => <CourseEdit match={match} />}
        />
        <Route
          path="/admin/feed-preview"
          render={() => <FeedPreview />}
        />
        <Route
          path="/admin/feedback-surveys"
          render={() => <FeedbackSurveys />}
        />
      </Switch>
      <BuildInfo />
    </>
  );
}

export default Admin;
