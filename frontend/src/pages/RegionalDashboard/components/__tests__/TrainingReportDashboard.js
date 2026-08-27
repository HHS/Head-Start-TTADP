import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router';
import userEvent from '@testing-library/user-event';
import AppLoadingContext from '../../../../AppLoadingContext';
import { getSessionReportsTable } from '../../../../fetchers/session';
import TrainingReportDashboard from '../TrainingReportDashboard';

jest.mock('../../../../fetchers/session');

describe('Training report Dashboard page', () => {
  const history = createMemoryHistory();
  const hoursOfTrainingUrl = '/api/widgets/trHoursOfTrainingByNationalCenter';
  const standardGoalsListUrl = '/api/widgets/trStandardGoalList';
  const overviewUrl = '/api/widgets/trOverview';
  const sessionsByTopicUrl = '/api/widgets/trSessionsByTopic';

  beforeEach(async () => {
    getSessionReportsTable.mockResolvedValue({ rows: [], count: 0 });
    fetchMock.get(overviewUrl, {
      numReports: '0',
      totalRecipients: '0',
      recipientPercentage: '0%',
      numGrants: '0',
      numRecipients: '0',
      sumDuration: '0',
      numParticipants: '0',
      numSessions: '0',
    });
    fetchMock.get(standardGoalsListUrl, []);
    fetchMock.get(hoursOfTrainingUrl, []);
    fetchMock.get(sessionsByTopicUrl, []);
  });

  afterEach(() => {
    fetchMock.restore();
    jest.clearAllMocks();
  });

  const renderTest = (filtersToApply = []) => {
    render(
      <Router history={history}>
        <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
          <TrainingReportDashboard filtersToApply={filtersToApply} />
        </AppLoadingContext.Provider>
      </Router>
    );
  };

  it('renders and fetches data', async () => {
    renderTest([]);

    expect(fetchMock.calls(overviewUrl)).toHaveLength(1);
    expect(fetchMock.calls(standardGoalsListUrl)).toHaveLength(1);
    expect(fetchMock.calls(hoursOfTrainingUrl)).toHaveLength(1);
    expect(fetchMock.calls(sessionsByTopicUrl)).toHaveLength(1);

    expect(document.querySelector('.smart-hub--dashboard-overview-container')).toBeTruthy();

    expect(screen.getByText('Goal categories in Training Report sessions')).toBeInTheDocument();
    expect(screen.getByText('Hours of training by National Center')).toBeInTheDocument();
    expect(screen.getByText('Number of TR sessions by topic')).toBeInTheDocument();
  });

  it('passes filtersToApply to the session reports table fetch', async () => {
    const filters = [
      {
        id: '1',
        topic: 'region',
        condition: 'is',
        query: 1,
      },
    ];
    renderTest(filters);

    await waitFor(() => {
      expect(getSessionReportsTable).toHaveBeenCalledWith(expect.any(Object), filters);
    });
  });

  it('uses empty filters when filtersToApply is not provided', async () => {
    renderTest();

    await waitFor(() => {
      expect(getSessionReportsTable).toHaveBeenCalledWith(expect.any(Object), []);
    });
  });

  it('requests Session start date sorting in desc then asc order', async () => {
    const row = {
      id: 1,
      eventId: 'R01-PD-123',
      eventName: 'Event Name',
      sessionName: 'Session Name',
      startDate: '2026-08-01',
      endDate: '2026-08-02',
      objectiveTopics: ['Topic A'],
      goalTemplates: [{ standard: 'Goal A' }],
    };

    getSessionReportsTable.mockResolvedValue({ rows: [row], count: 1 });

    renderTest();

    await waitFor(() => {
      expect(getSessionReportsTable).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'Event_ID', direction: 'desc' }),
        []
      );
    });

    const startDateSortButton = await screen.findByRole('button', {
      name: /startdate\. activate to sort ascending/i,
    });
    userEvent.click(startDateSortButton);

    await waitFor(() => {
      expect(getSessionReportsTable).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: 'startDate', direction: 'desc' }),
        []
      );
    });

    const startDateSortButtonSecondClick = await screen.findByRole('button', {
      name: /startdate\. activate to sort ascending/i,
    });
    userEvent.click(startDateSortButtonSecondClick);

    await waitFor(() => {
      expect(getSessionReportsTable).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: 'startDate', direction: 'asc' }),
        []
      );
    });
  });

  it('requests Session end date sorting in desc then asc order', async () => {
    const row = {
      id: 2,
      eventId: 'R01-PD-456',
      eventName: 'Another Event',
      sessionName: 'Another Session',
      startDate: '2026-09-01',
      endDate: '2026-09-02',
      objectiveTopics: ['Topic B'],
      goalTemplates: [{ standard: 'Goal B' }],
    };

    getSessionReportsTable.mockResolvedValue({ rows: [row], count: 1 });

    renderTest();

    const endDateSortButton = await screen.findByRole('button', {
      name: /enddate\. activate to sort ascending/i,
    });
    userEvent.click(endDateSortButton);

    await waitFor(() => {
      expect(getSessionReportsTable).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: 'endDate', direction: 'desc' }),
        []
      );
    });

    const endDateSortButtonSecondClick = await screen.findByRole('button', {
      name: /enddate\. activate to sort ascending/i,
    });
    userEvent.click(endDateSortButtonSecondClick);

    await waitFor(() => {
      expect(getSessionReportsTable).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: 'endDate', direction: 'asc' }),
        []
      );
    });
  });
});
