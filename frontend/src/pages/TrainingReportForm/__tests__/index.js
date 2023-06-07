import React from 'react';
import moment from 'moment';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import TrainingReportForm from '../index';
import UserContext from '../../../UserContext';
import AppLoadingContext from '../../../AppLoadingContext';

describe('TrainingReportForm', () => {
  const history = createMemoryHistory();

  const renderTrainingReportForm = (trainingReportId, currentPage) => render(
    <Router history={history}>
      <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
        <UserContext.Provider value={{ user: { id: 1, permissions: [], name: 'Ted User' } }}>
          <TrainingReportForm match={{
            params: { currentPage, trainingReportId },
            path: currentPage,
            url: currentPage,
          }}
          />
        </UserContext.Provider>
      </AppLoadingContext.Provider>
    </Router>,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.reset();

    // the basic app before stuff
    fetchMock.get('/api/alerts', []);
    fetchMock.get('/api/users/statistics', {});
    fetchMock.get('/api/users/training-report-users?regionId=1', {
      pointOfContact: [],
      collaborators: [],
    });
  });

  it('renders training report form', async () => {
    fetchMock.getOnce('/api/events/id/1', {
      id: 1, name: 'test event', regionId: '1', reportId: 1, collaboratorIds: [], ownerId: 1,
    });

    act(() => {
      renderTrainingReportForm('1', 'event-summary');
    });

    expect(screen.getByText(/Regional\/National Training Report/i)).toBeInTheDocument();
  });

  it('redirects to event summary', async () => {
    fetchMock.getOnce('/api/events/id/1', {
      id: 1, name: 'test event', regionId: '1', reportId: 1, collaboratorIds: [], ownerId: 1,
    });

    act(() => {
      renderTrainingReportForm('1', 'event-summary');
    });

    // this test might not seem too effective, but it fails if the component is not
    // wrapped in a Router

    expect(screen.getByText(/Regional\/National Training Report/i)).toBeInTheDocument();
  });

  it('fetches event report data', async () => {
    fetchMock.getOnce('/api/events/id/123', {
      regionId: '1', reportId: 1, collaboratorIds: [], ownerId: 1,
    });
    renderTrainingReportForm('123', 'event-summary');
    expect(fetchMock.called('/api/events/id/123')).toBe(true);
  });

  it('displays error when event report fails to load', async () => {
    fetchMock.getOnce('/api/events/id/123', 500);
    act(() => {
      renderTrainingReportForm('123', 'event-summary');
    });

    expect(fetchMock.called('/api/events/id/123')).toBe(true);
    expect(await screen.findByText(/error fetching training report/i)).toBeInTheDocument();
  });

  it('displays "no training report id provided" error', async () => {
    fetchMock.getOnce('/api/events/id/123', {
      regionId: '1', reportId: 1, data: {}, collaboratorIds: [], ownerId: 1,
    });
    act(() => {
      renderTrainingReportForm('', 'event-summary');
    });

    expect(screen.getByText(/no training report id provided/i)).toBeInTheDocument();
  });

  it('validates the form when the save & continue button is pressed', async () => {
    fetchMock.getOnce('/api/events/id/123', {
      regionId: '1',
      reportId: 1,
      data: {},
      collaboratorIds: [],
      ownerId: 1,
      pocId: 1,
    });
    renderTrainingReportForm('123', 'event-summary');
    expect(fetchMock.called('/api/events/id/123')).toBe(true);

    fetchMock.put('/api/events/id/123', { regionId: '1', reportId: 1, data: {} });
    expect(fetchMock.called('/api/events/id/123', { method: 'PUT' })).toBe(false);
    const onSaveAndContinueButton = screen.getByText(/save and continue/i);
    act(() => {
      userEvent.click(onSaveAndContinueButton);
    });

    await screen.findByText('Select collaborators');

    // check that fetch mock was NOT called with a put request
    expect(fetchMock.called('/api/events/id/123', { method: 'PUT' })).toBe(false);
  });

  it('tests the on save & continue button', async () => {
    fetchMock.getOnce('/api/events/id/123', {
      regionId: '1',
      reportId: 1,
      data: {
        eventIntendedAudience: 'recipients',
        eventOrganizer: 'Regional PD Event (with National Centers)',
        targetPopulations: ['Infants and Toddlers (ages birth to 3)'],
        reasons: ['School Readiness Goals'],
        startDate: '01/01/2021',
        endDate: '01/01/2021',
      },
      collaboratorIds: [1],
      ownerId: 1,
      pocId: 1,
    });

    act(() => {
      renderTrainingReportForm('123', 'event-summary');
    });
    expect(fetchMock.called('/api/events/id/123', { method: 'GET' })).toBe(true);

    await screen.findAllByRole('radio', { checked: true });

    const updatedAt = moment();

    fetchMock.put('/api/events/id/123', {
      regionId: '1', reportId: 1, data: {}, updatedAt,
    });
    expect(fetchMock.called('/api/events/id/123', { method: 'PUT' })).toBe(false);
    const onSaveAndContinueButton = screen.getByText(/save and continue/i);
    act(() => {
      userEvent.click(onSaveAndContinueButton);
    });

    // check that fetch mock was called with a put request
    await waitFor(() => expect(fetchMock.called('/api/events/id/123', { method: 'PUT' })).toBe(true));
  });

  it('tests the on save draft event', async () => {
    fetchMock.getOnce('/api/events/id/123', {
      regionId: '1', reportId: 1, data: {}, ownerId: 1,
    });
    act(() => {
      renderTrainingReportForm('123', 'event-summary');
    });
    expect(fetchMock.called('/api/events/id/123', { method: 'GET' })).toBe(true);

    fetchMock.put('/api/events/id/123', {
      regionId: '1', reportId: 1, data: {}, ownerId: 1,
    });
    const onSaveDraftButton = screen.getByText(/save draft/i);
    act(() => {
      userEvent.click(onSaveDraftButton);
    });

    // check that fetch mock was called with a put request
    await waitFor(() => expect(fetchMock.called('/api/events/id/123', { method: 'PUT' })).toBe(true));
  });
});
