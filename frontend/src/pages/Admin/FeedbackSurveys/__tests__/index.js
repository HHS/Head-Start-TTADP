import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { MemoryRouter, Route } from 'react-router-dom';
import FeedbackSurveys from '..';

jest.mock('../Responses', () => () => <p>responses tab</p>);

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Route path="/admin/feedback-surveys" render={() => <FeedbackSurveys />} />
  </MemoryRouter>,
);

describe('FeedbackSurveys tabs', () => {
  beforeEach(() => {
    fetchMock.get('/api/admin/feedback-survey-definitions', { active: [], closed: [], pages: {} });
  });

  afterEach(() => fetchMock.restore());

  it('shows Manage surveys as the first tab and redirects to it by default', async () => {
    renderAt('/admin/feedback-surveys');

    const tabs = screen.getAllByRole('link').filter((link) => link.closest('nav'));
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Manage surveys', 'Responses']);
    expect(await screen.findByRole('heading', { name: 'Manage surveys' })).toBeVisible();
  });

  it('renders the responses tab', () => {
    renderAt('/admin/feedback-surveys/responses');

    expect(screen.getByText('responses tab')).toBeVisible();
  });

  it('renders the create form', async () => {
    renderAt('/admin/feedback-surveys/manage/new');

    expect(await screen.findByRole('heading', { name: 'Create new survey' })).toBeVisible();
  });
});
