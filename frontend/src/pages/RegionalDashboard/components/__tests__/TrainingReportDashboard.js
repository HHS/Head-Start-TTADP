import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import TrainingReportDashboard from '../TrainingReportDashboard';
import AppLoadingContext from '../../../../AppLoadingContext';

describe('Training report Dashboard page', () => {
  const hoursOfTrainingUrl = '/api/widgets/trHoursOfTrainingByNationalCenter';
  const standardGoalsListUrl = '/api/widgets/trStandardGoalList';
  const overviewUrl = '/api/widgets/trOverview';
  const sessionsByTopicUrl = '/api/widgets/trSessionsByTopic';

  beforeEach(async () => {
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

  afterEach(() => fetchMock.restore());

  const renderTest = () => {
    render(
      <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
        <TrainingReportDashboard />
      </AppLoadingContext.Provider>,
    );
  };

  it('renders and fetches data', async () => {
    renderTest();

    expect(fetchMock.calls(overviewUrl)).toHaveLength(1);
    expect(fetchMock.calls(standardGoalsListUrl)).toHaveLength(1);
    expect(fetchMock.calls(hoursOfTrainingUrl)).toHaveLength(1);
    expect(fetchMock.calls(sessionsByTopicUrl)).toHaveLength(1);

    expect(document.querySelector('.smart-hub--dashboard-overview-container')).toBeTruthy();

    expect(screen.getByText('Goal categories in Training Report sessions')).toBeInTheDocument();
    expect(screen.getByText('Hours of training by National Center')).toBeInTheDocument();
    expect(screen.getByText('Number of TR sessions by topic')).toBeInTheDocument();
  });
});
