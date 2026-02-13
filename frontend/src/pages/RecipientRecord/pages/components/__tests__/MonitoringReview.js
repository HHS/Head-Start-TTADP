/* eslint-disable jest/expect-expect */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import fetchMock from 'fetch-mock'

import MonitoringReview from '../MonitoringReview'
import { GrantDataProvider } from '../../GrantDataContext'

const grantNumber = '1'
const regionId = 1
const recipientId = 1

const apiUrl = `/api/monitoring/${recipientId}/region/${regionId}/grant/${grantNumber}`

const renderMonitoringReview = () =>
  render(
    <GrantDataProvider>
      <MonitoringReview grantNumber={grantNumber} regionId={regionId} recipientId={recipientId} />
    </GrantDataProvider>
  )

const testReviewStatus = async (status, expectedText, reviewDate = '05/01/2023') => {
  fetchMock.getOnce(apiUrl, {
    reviewStatus: status,
    reviewDate,
    reviewType: 'Type A',
  })

  renderMonitoringReview()
  expect(await screen.findByText(`${status} as of ${reviewDate}`)).toHaveTextContent(expectedText)
}

describe('MonitoringReview', () => {
  afterEach(() => {
    fetchMock.restore()
  })

  describe('compliance status', () => {
    it('shows compliant badge', () => testReviewStatus('Compliant', 'Compliant'))
    it('shows noncompliant badge', () => testReviewStatus('Noncompliant', 'Noncompliant'))
    it('shows deficient badge', () => testReviewStatus('Deficient', 'Deficient'))
  })

  describe('review type', () => {
    it('displays correct review type', async () => {
      fetchMock.getOnce(apiUrl, {
        reviewStatus: 'Compliant',
        reviewDate: '05/01/2023',
        reviewType: 'Type B',
      })

      renderMonitoringReview()
      expect(await screen.findByText('Review type')).toBeInTheDocument()
      expect(screen.getByText('Type B')).toBeInTheDocument()
    })
  })
})
