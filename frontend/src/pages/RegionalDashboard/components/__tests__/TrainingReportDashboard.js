import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import TrainingReportDashboard from '../TrainingReportDashboard'
import AppLoadingContext from '../../../../AppLoadingContext'

describe('Training report Dashboard page', () => {
  const hoursOfTrainingUrl = '/api/widgets/trHoursOfTrainingByNationalCenter'
  const reasonListUrl = '/api/widgets/trReasonList'
  const overviewUrl = '/api/widgets/trOverview'
  const sessionsByTopicUrl = '/api/widgets/trSessionsByTopic'

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
    })
    fetchMock.get(reasonListUrl, [])
    fetchMock.get(hoursOfTrainingUrl, [])
    fetchMock.get(sessionsByTopicUrl, [])
  })

  afterEach(() => fetchMock.restore())

  const renderTest = () => {
    render(
      <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
        <TrainingReportDashboard />
      </AppLoadingContext.Provider>
    )
  }

  it('renders and fetches data', async () => {
    renderTest()

    expect(fetchMock.calls(overviewUrl)).toHaveLength(1)
    expect(fetchMock.calls(reasonListUrl)).toHaveLength(1)
    expect(fetchMock.calls(hoursOfTrainingUrl)).toHaveLength(1)
    expect(fetchMock.calls(sessionsByTopicUrl)).toHaveLength(1)

    expect(document.querySelector('.smart-hub--dashboard-overview-container')).toBeTruthy()

    expect(screen.getByText('Reasons in Training Reports')).toBeInTheDocument()
    expect(screen.getByText('Hours of training by National Center')).toBeInTheDocument()
    expect(screen.getByText('Number of TR sessions by topic')).toBeInTheDocument()
  })
})
