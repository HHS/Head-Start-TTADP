import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import AppLoadingContext from '../../../../AppLoadingContext';
import { getSessionReportsTable } from '../../../../fetchers/session';
import TrainingReportDashboard from '../TrainingReportDashboard';

jest.mock('../../../../fetchers/session');

describe('Training report Dashboard page', () => {
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
      <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
        <TrainingReportDashboard filtersToApply={filtersToApply} />
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
});
