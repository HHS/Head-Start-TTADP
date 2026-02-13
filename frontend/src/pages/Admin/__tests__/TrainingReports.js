import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import { Router } from 'react-router'
import { createMemoryHistory } from 'history'
import TrainingReports from '../TrainingReports'

describe('Training Reports page', () => {
  afterEach(() => {
    fetchMock.restore()
    jest.clearAllMocks()
  })

  it('displays the training reports page', async () => {
    const history = createMemoryHistory()
    render(
      <Router history={history}>
        <TrainingReports />
      </Router>
    )

    // Assert Displays text 'Training Report Import'
    const trainingReports = await screen.findByRole('heading', { name: /training reports import/i })
    expect(trainingReports).toBeVisible()

    // Assert text 'Input accepts a single file'.
    const inputAccepts = await screen.findByText(/Input accepts a single file/i)
    expect(inputAccepts).toBeVisible()

    // Assert by data-testid 'file-input-input'.
    const fileInput = await screen.findByTestId('file-input-input')
    expect(fileInput).toBeVisible()

    // Assert button 'Upload training reports' is visible.
    const uploadButton = await screen.findByRole('button', { name: /Upload training reports/i })
    expect(uploadButton).toBeVisible()
  })
})
