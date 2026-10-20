import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import moment from 'moment';
import React from 'react';
import { MemoryRouter, Route } from 'react-router-dom';
import CreateSurvey from '../CreateSurvey';

const URL = '/api/admin/feedback-survey-definitions';
const day = (offset) => moment().add(offset, 'days').format('YYYY-MM-DD');
const display = (offset) => moment().add(offset, 'days').format('MM/DD/YYYY');

const PAGES = { 'qa-dashboard': 'QA dashboard', 'activity-reports-landing': 'Activity reports' };

const renderCreate = () => render(
  <MemoryRouter initialEntries={['/admin/feedback-surveys/manage/new']}>
    <Route path="/admin/feedback-surveys/manage/new" render={() => <CreateSurvey />} />
    <Route
      exact
      path="/admin/feedback-surveys/manage"
      render={({ location }) => <p>{`manage page: ${location.state?.message}`}</p>}
    />
  </MemoryRouter>,
);

const fillDates = async () => {
  await userEvent.type(screen.getByRole('textbox', { name: /start date/i }), display(1));
  await userEvent.type(screen.getByRole('textbox', { name: /end date/i }), display(30));
};

describe('CreateSurvey', () => {
  beforeEach(() => {
    fetchMock.get(URL, { active: [], closed: [], pages: PAGES });
  });

  afterEach(() => fetchMock.restore());

  it('lists the survey pages from the API', async () => {
    renderCreate();

    expect(await screen.findByRole('option', { name: 'QA dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Activity reports' })).toBeInTheDocument();
  });

  it('requires a page and a non-blank question', async () => {
    renderCreate();

    await screen.findByRole('option', { name: 'QA dashboard' });
    await fillDates();
    await userEvent.type(screen.getByLabelText(/^question/i), '   ');
    await userEvent.click(screen.getByRole('button', { name: /create survey/i }));

    expect(await screen.findByText('Select a page')).toBeVisible();
    expect(screen.getByText('Enter a question')).toBeVisible();
    expect(fetchMock.called(URL, { method: 'POST' })).toBe(false);
  });

  it('creates a survey and returns to the manage tab', async () => {
    fetchMock.post(URL, { id: 1 });
    renderCreate();

    await screen.findByRole('option', { name: 'QA dashboard' });
    await userEvent.selectOptions(screen.getByLabelText(/^page/i), 'qa-dashboard');
    await fillDates();
    await userEvent.type(screen.getByLabelText(/^question/i), ' Was this helpful? ');
    await userEvent.click(screen.getByRole('button', { name: /create survey/i }));

    await waitFor(() => expect(fetchMock.called(URL, { method: 'POST' })).toBe(true));
    expect(JSON.parse(fetchMock.lastOptions(URL, { method: 'POST' }).body)).toEqual({
      pageId: 'qa-dashboard',
      startDate: day(1),
      endDate: day(30),
      question: 'Was this helpful?',
    });
    expect(await screen.findByText('manage page: Survey for QA dashboard created')).toBeVisible();
  });

  it('disables the dates and shows a note when the survey is closed manually', async () => {
    renderCreate();

    const start = await screen.findByRole('textbox', { name: /start date/i });
    const end = screen.getByRole('textbox', { name: /end date/i });
    expect(start).toBeEnabled();
    expect(screen.queryByText(/will open immediately/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: /manually close survey/i }));

    expect(start).toBeDisabled();
    expect(end).toBeDisabled();
    expect(screen.getByText('The survey will open immediately and stay open until you close it.')).toBeVisible();

    await userEvent.click(screen.getByRole('checkbox', { name: /manually close survey/i }));
    expect(start).toBeEnabled();
  });

  it('creates a manually closed survey without dates', async () => {
    fetchMock.post(URL, { id: 1 });
    renderCreate();

    await screen.findByRole('option', { name: 'QA dashboard' });
    await userEvent.selectOptions(screen.getByLabelText(/^page/i), 'qa-dashboard');
    await userEvent.click(screen.getByRole('checkbox', { name: /manually close survey/i }));
    await userEvent.type(screen.getByLabelText(/^question/i), 'Was this helpful?');
    await userEvent.click(screen.getByRole('button', { name: /create survey/i }));

    await waitFor(() => expect(fetchMock.called(URL, { method: 'POST' })).toBe(true));
    expect(JSON.parse(fetchMock.lastOptions(URL, { method: 'POST' }).body)).toEqual({
      pageId: 'qa-dashboard',
      question: 'Was this helpful?',
      manualClose: true,
    });
  });

  it('shows API errors', async () => {
    fetchMock.post(URL, { status: 400, body: { error: 'QA dashboard already has an active survey' } });
    renderCreate();

    await screen.findByRole('option', { name: 'QA dashboard' });
    await userEvent.selectOptions(screen.getByLabelText(/^page/i), 'qa-dashboard');
    await fillDates();
    await userEvent.type(screen.getByLabelText(/^question/i), 'Was this helpful?');
    await userEvent.click(screen.getByRole('button', { name: /create survey/i }));

    expect(await screen.findByText('QA dashboard already has an active survey')).toBeVisible();
  });
});
