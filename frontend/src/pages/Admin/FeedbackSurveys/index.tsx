import React from 'react';
import { Helmet } from 'react-helmet';
import { Redirect, Route, Switch } from 'react-router-dom';
import Container from '../../../components/Container';
import Tabs from '../../../components/Tabs';
import CreateSurvey from './CreateSurvey';
import ManageSurveys from './ManageSurveys';
import Responses from './Responses';

const TABS = [
  { key: 'Manage surveys', value: 'manage' },
  { key: 'Responses', value: 'responses' },
];

export default function FeedbackSurveys(): React.ReactElement {
  return (
    <>
      <Helmet>
        <title>Feedback surveys</title>
      </Helmet>
      <Tabs tabs={TABS} ariaLabel="Feedback surveys" prefix="admin/feedback-surveys" />
      <Switch>
        <Route
          path="/admin/feedback-surveys/manage/new"
          render={() => (
            <Container>
              <CreateSurvey />
            </Container>
          )}
        />
        <Route
          path="/admin/feedback-surveys/manage"
          render={() => (
            <Container>
              <ManageSurveys />
            </Container>
          )}
        />
        <Route path="/admin/feedback-surveys/responses" render={() => <Responses />} />
        <Redirect to="/admin/feedback-surveys/manage" />
      </Switch>
    </>
  );
}
