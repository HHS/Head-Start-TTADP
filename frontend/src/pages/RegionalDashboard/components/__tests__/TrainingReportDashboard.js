import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import AppLoadingContext from '../../../../AppLoadingContext';
import { getSessionReportsTable } from '../../../../fetchers/session';
import useRequestSort from '../../../../hooks/useRequestSort';
import useSessionSort from '../../../../hooks/useSessionSort';
import TrainingReportDashboard from '../TrainingReportDashboard';

jest.mock('../../../../fetchers/session');
jest.mock('../../../../hooks/useRequestSort');
jest.mock('../../../../hooks/useSessionSort');

describe('Training report Dashboard page', () => {
  const hoursOfTrainingUrl = '/api/widgets/trHoursOfTrainingByNationalCenter';
  const standardGoalsListUrl = '/api/widgets/trStandardGoalList';
  const overviewUrl = '/api/widgets/trOverview';
  const sessionsByTopicUrl = '/api/widgets/trSessionsByTopic';
  const mockSetSortConfig = jest.fn();
  const mockSetResetPagination = jest.fn();

  beforeEach(async () => {
    getSessionReportsTable.mockResolvedValue({ rows: [], count: 0 });
    useRequestSort.mockReturnValue(jest.fn());
    useSessionSort.mockReturnValue([
      {
        sortBy: 'Event_ID',
        direction: 'desc',
        activePage: 2,
        offset: 10,
      },
      mockSetSortConfig,
    ]);
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
      <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
        <TrainingReportDashboard
          filtersToApply={filtersToApply}
          filterKey="regional-dashboard-training-reports"
          setResetPagination={mockSetResetPagination}
        />
      </AppLoadingContext.Provider>
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

  it('resets persisted pagination when requested', async () => {
    render(
      <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
        <TrainingReportDashboard
          filtersToApply={[]}
          filterKey="regional-dashboard-training-reports"
          resetPagination
          setResetPagination={mockSetResetPagination}
        />
      </AppLoadingContext.Provider>
    );

    await waitFor(() => {
      expect(mockSetSortConfig).toHaveBeenCalledWith(expect.any(Function));
    });

    const updateSortConfig = mockSetSortConfig.mock.calls[0][0];
    expect(
      updateSortConfig({
        sortBy: 'Event_ID',
        direction: 'desc',
        activePage: 2,
        offset: 10,
      })
    ).toEqual({
      sortBy: 'Event_ID',
      direction: 'desc',
      activePage: 1,
      offset: 0,
    });
    expect(mockSetResetPagination).toHaveBeenCalledWith(false);
  });
});
