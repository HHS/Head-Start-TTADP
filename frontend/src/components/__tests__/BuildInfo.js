import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'
import BuildInfo from '../BuildInfo'

// Mock the fetch API globally for tests
global.fetch = jest.fn()

const mockBuildInfo = {
  branch: 'main',
  commit: 'abcdef12345',
  buildNumber: '123',
  timestamp: '2024-11-13 12:34:56',
}

describe('BuildInfo', () => {
  beforeEach(() => {
    fetch.mockClear()
  })

  it('renders build information when API call is successful', async () => {
    // Mock successful fetch response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockBuildInfo,
    })

    render(<BuildInfo />)

    // Wait for build info to be rendered
    await waitFor(() => {
      expect(screen.getByText(/Branch:/)).toBeInTheDocument()
      expect(screen.getByText(/main/)).toBeInTheDocument()
      expect(screen.getByText(/Commit:/)).toBeInTheDocument()
      expect(screen.getByText(/abcdef12345/)).toBeInTheDocument()
      expect(screen.getByText(/Build Number:/)).toBeInTheDocument()
      expect(screen.getByText(/123/)).toBeInTheDocument()
      expect(screen.getByText(/Deployed on:/)).toBeInTheDocument()
      expect(screen.getByText(/2024-11-13 12:34:56/)).toBeInTheDocument()
    })
  })

  it('does not render build information if API call fails', async () => {
    // Mock failed fetch response
    fetch.mockRejectedValueOnce(new Error('API is down'))

    render(<BuildInfo />)

    // Wait to confirm no content is displayed
    await waitFor(() => {
      expect(screen.queryByText(/Branch:/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Commit:/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Build Number:/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Deployed on:/)).not.toBeInTheDocument()
    })
  })

  it('renders null when response.ok is false', async () => {
    // Mock response with ok: false to simulate failure
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => mockBuildInfo,
    })

    const { container } = render(<BuildInfo />)

    // Wait to confirm that nothing is rendered due to error
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })
})
