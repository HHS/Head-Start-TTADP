import '@testing-library/jest-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import moment from 'moment';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import ManageSurveys from '../ManageSurveys';

const URL = '/api/admin/feedback-survey-definitions';
const day = (offset) => moment().add(offset, 'days').format('YYYY-MM-DD');
const display = (offset) => moment().add(offset, 'days').format('MM/DD/YYYY');

const PAGES = { 'qa-dashboard': 'QA dashboard', 'activity-reports-landing': 'Activity reports' };

const activeSurvey = {
  id: 1,
  pageId: 'qa-dashboard',
  startDate: day(-2),
  endDate: day(10),
  status: 'active',
  closedAt: null,
  responseCount: 4,
  questions: [{ id: 11, questionText: 'Was this helpful?', order: 1 }],
};

const scheduledSurvey = {
  ...activeSurvey,
  id: 2,
  pageId: 'activity-reports-landing',
  startDate: day(5),
  endDate: day(15),
  responseCount: 0,
  questions: [{ id: 21, questionText: 'Coming soon?', order: 1 }],
};

const closedSurvey = {
  ...activeSurvey,
  id: 3,
  startDate: day(-40),
  endDate: day(-30),
  status: 'closed',
  closedAt: `${day(-29)}T09:00:00.000Z`,
  responseCount: 12,
  questions: [{ id: 31, questionText: 'Old question?', order: 1 }],
};

const manualClosedSurvey = {
  ...closedSurvey,
  id: 4,
  pageId: 'activity-reports-landing',
  endDate: null,
  closedAt: `${day(-3)}T09:00:00.000Z`,
  questions: [{ id: 41, questionText: 'Manual question?', order: 1 }],
};

const renderManage = () => render(
  <MemoryRouter initialEntries={['/admin/feedback-surveys/manage']}>
    <ManageSurveys />
  </MemoryRouter>,
);

describe('ManageSurveys', () => {
  beforeEach(() => {
    fetchMock.get(URL, {
      active: [activeSurvey, scheduledSurvey],
      closed: [closedSurvey, manualClosedSurvey],
      pages: PAGES,
    });
  });

  afterEach(() => fetchMock.restore());

  it('renders active and closed survey tables', async () => {
    renderManage();

    const activeTable = (await screen.findByRole('heading', { name: 'Active surveys' })).parentElement;
    const closedTable = screen.getByRole('heading', { name: 'Closed surveys' }).parentElement;

    expect(within(activeTable).getByText('QA dashboard')).toBeVisible();
    expect(within(activeTable).getByText('Was this helpful?')).toBeVisible();
    expect(within(activeTable).getByText('Active')).toBeVisible();
    expect(within(activeTable).getByText('Scheduled')).toBeVisible();
    expect(within(activeTable).getByRole('link', { name: '4' })).toHaveAttribute('href', '/admin/feedback-surveys/responses?surveyId=1');

    expect(within(closedTable).getByText('Old question?')).toBeVisible();
    expect(within(closedTable).getByText(display(-29))).toBeVisible();
    expect(within(closedTable).getByRole('button', { name: /reopen survey for qa dashboard/i })).toBeVisible();
  });

  it('shows "Until closed" for surveys without an end date', async () => {
    renderManage();

    const closedTable = (await screen.findByRole('heading', { name: 'Closed surveys' })).parentElement;
    expect(within(closedTable).getByText('Until closed')).toBeVisible();
  });

  it('reopens a manually closed survey with manual close already checked', async () => {
    fetchMock.put(`${URL}/4/reopen`, { ...manualClosedSurvey, status: 'active' });
    renderManage();

    await userEvent.click(await screen.findByRole('button', { name: /reopen survey for activity reports/i }));

    expect(await screen.findByRole('checkbox', { name: /manually close survey/i })).toBeChecked();
    expect(screen.getByRole('textbox', { name: /end date/i })).toBeDisabled();
    expect(screen.getByText(/will open immediately/i)).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: /^reopen survey$/i }));

    await waitFor(() => expect(fetchMock.called(`${URL}/4/reopen`)).toBe(true));
    expect(JSON.parse(fetchMock.lastOptions(`${URL}/4/reopen`).body)).toEqual({ manualClose: true });
  });

  it('links to the create form', async () => {
    renderManage();

    expect(await screen.findByRole('link', { name: /create new survey/i })).toHaveAttribute('href', '/admin/feedback-surveys/manage/new');
  });

  it('shows empty states', async () => {
    fetchMock.restore();
    fetchMock.get(URL, { active: [], closed: [], pages: PAGES });

    renderManage();

    expect(await screen.findByText('There are no active or scheduled surveys.')).toBeVisible();
    expect(screen.getByText('There are no closed surveys.')).toBeVisible();
  });

  it('shows an error when surveys fail to load', async () => {
    fetchMock.restore();
    fetchMock.get(URL, 500);

    renderManage();

    expect(await screen.findByText('There was an error fetching feedback surveys.')).toBeVisible();
  });

  it('closes a survey after confirming', async () => {
    fetchMock.put(`${URL}/1/close`, { ...activeSurvey, status: 'closed' });
    renderManage();

    await userEvent.click(await screen.findByRole('button', { name: /close survey for qa dashboard/i }));
    await userEvent.click(screen.getByRole('button', { name: /^close survey$/i }));

    await waitFor(() => expect(fetchMock.called(`${URL}/1/close`)).toBe(true));
    expect(await screen.findByText('Survey for QA dashboard closed')).toBeVisible();
    expect(fetchMock.calls(URL)).toHaveLength(2);
  });

  it('shows the API message when closing fails', async () => {
    fetchMock.put(`${URL}/1/close`, { status: 400, body: { error: 'Survey is already closed' } });
    renderManage();

    await userEvent.click(await screen.findByRole('button', { name: /close survey for qa dashboard/i }));
    await userEvent.click(screen.getByRole('button', { name: /^close survey$/i }));

    expect(await screen.findByText('Survey is already closed')).toBeVisible();
  });

  it('reopens a closed survey with new dates', async () => {
    fetchMock.put(`${URL}/3/reopen`, { ...closedSurvey, status: 'active' });
    renderManage();

    await userEvent.click(await screen.findByRole('button', { name: /reopen survey for qa dashboard/i }));

    // The old window is in the past, so the form starts today with no end date
    const start = await screen.findByRole('textbox', { name: /start date/i });
    expect(start).toHaveValue(display(0));
    const end = screen.getByRole('textbox', { name: /end date/i });
    await userEvent.type(end, display(20));

    await userEvent.click(screen.getByRole('button', { name: /^reopen survey$/i }));

    await waitFor(() => expect(fetchMock.called(`${URL}/3/reopen`)).toBe(true));
    expect(JSON.parse(fetchMock.lastOptions(`${URL}/3/reopen`).body)).toEqual({
      startDate: day(0),
      endDate: day(20),
    });
    expect(await screen.findByText('Survey for QA dashboard reopened')).toBeVisible();
  });

  it('shows overlap errors from reopen inside the modal', async () => {
    fetchMock.put(`${URL}/3/reopen`, { status: 400, body: { error: 'QA dashboard already has an active survey' } });
    renderManage();

    await userEvent.click(await screen.findByRole('button', { name: /reopen survey for qa dashboard/i }));
    await userEvent.type(await screen.findByRole('textbox', { name: /end date/i }), display(20));
    await userEvent.click(screen.getByRole('button', { name: /^reopen survey$/i }));

    expect(await screen.findByText('QA dashboard already has an active survey')).toBeVisible();
  });
});
