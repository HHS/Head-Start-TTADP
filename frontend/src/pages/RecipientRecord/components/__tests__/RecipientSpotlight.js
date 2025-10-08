import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, waitFor,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import RecipientSpotlight from '../RecipientSpotlight';

// Sample data for tests
const mockSpotlightData = [
  {
    recipientId: 1,
    regionId: 1,
    recipientName: 'Recipient A',
    grantIds: [1, 2, 3],
    childIncidents: true,
    deficiency: false,
    newRecipients: true,
    newStaff: false,
    noTTA: true,
    DRS: false,
    FEI: false,
  },
];

// Mock data with all indicators set to false
const noIndicatorsMockData = [{
  recipientId: 1,
  regionId: 1,
  recipientName: 'Recipient A',
  grantIds: [1, 2, 3],
  childIncidents: false,
  deficiency: false,
  newRecipients: false,
  newStaff: false,
  noTTA: false,
  DRS: false,
  FEI: false,
}];

// Mock empty response
const emptyMockSpotlightData = [{}];

// Completely empty response (no results)
const noResultsMockData = [];

describe('RecipientSpotlight', () => {
  const renderRecipientSpotlight = (recipientId = 1, regionId = 1) => {
    render(
      <div data-testid="recipient-spotlight-container">
        <RecipientSpotlight recipientId={recipientId} regionId={regionId} />
      </div>,
    );
  };

  beforeEach(() => fetchMock.restore());

  it('renders the component with header initially', () => {
    // No need to mock API yet as we're just testing initial render
    renderRecipientSpotlight();

    // Should show the header text initially
    expect(screen.getByText('Recipient spotlight')).toBeInTheDocument();
    expect(screen.getByText("This is the recipient's current number of priority indicators.")).toBeInTheDocument();
  });

  it('shows recipient may need prioritized attention when indicators are present', async () => {
    // Mock the API endpoint directly
    const spotlightUrl = '/api/recipient-spotlight/recipientId/1/regionId/1?sortBy=recipientName&sortDir=desc&offset=0&limit=10';
    fetchMock.get(spotlightUrl, mockSpotlightData);

    renderRecipientSpotlight();
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      expect(screen.getByText(/Recipient may need prioritized attention/i)).toBeInTheDocument();
      expect(screen.getByText(/3 of 7 priority indicators/i)).toBeInTheDocument();
    });
  });

  it('shows "No priority indicators identified" when no indicators are present', async () => {
    const spotlightUrl = '/api/recipient-spotlight/recipientId/1/regionId/1?sortBy=recipientName&sortDir=desc&offset=0&limit=10';
    fetchMock.get(spotlightUrl, noIndicatorsMockData);

    renderRecipientSpotlight();
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      expect(screen.getByText(/No priority indicators identified/i)).toBeInTheDocument();
      expect(screen.getByText(/0 of 7 priority indicators/i)).toBeInTheDocument();
    });
  });

  it('displays the correct number of indicators with their states', async () => {
    const spotlightUrl = '/api/recipient-spotlight/recipientId/1/regionId/1?sortBy=recipientName&sortDir=desc&offset=0&limit=10';
    fetchMock.get(spotlightUrl, mockSpotlightData);

    renderRecipientSpotlight();
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      // Find all indicators with bad-indicator class (true)
      const badIndicators = document.querySelectorAll('.ttahub-recipient-spotlight-content-cell-bad-indicator');
      expect(badIndicators).toHaveLength(3);

      // Find all indicators with good-indicator class (false)
      const goodIndicators = document.querySelectorAll('.ttahub-recipient-spotlight-content-cell-good-indicator');
      expect(goodIndicators).toHaveLength(4);
    });

    // Verify specific indicators from our mock data
    expect(screen.getByText('Child incidents')).toBeInTheDocument();
    expect(screen.getByText('New recipients')).toBeInTheDocument();
    expect(screen.getByText('No TTA')).toBeInTheDocument();
  });

  it('handles API error gracefully with NoResultsFound', async () => {
    const spotlightUrl = '/api/recipient-spotlight/recipientId/1/regionId/1?sortBy=recipientName&sortDir=desc&offset=0&limit=10';
    fetchMock.get(spotlightUrl, 500);

    renderRecipientSpotlight();
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      // Verify header is still present
      expect(screen.getByText('Recipient spotlight')).toBeInTheDocument();
      expect(screen.getByText("This is the recipient's current number of priority indicators.")).toBeInTheDocument();

      // Verify NoResultsFound component is rendered
      expect(screen.getByText('No results found.')).toBeInTheDocument();
      expect(screen.getByText('There are no current priority indicators for this recipient.')).toBeInTheDocument();
    });
  });

  it('handles empty response object gracefully with NoResultsFound', async () => {
    const spotlightUrl = '/api/recipient-spotlight/recipientId/1/regionId/1?sortBy=recipientName&sortDir=desc&offset=0&limit=10';
    fetchMock.get(spotlightUrl, emptyMockSpotlightData);

    renderRecipientSpotlight();
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      // Verify header is still present
      expect(screen.getByText('Recipient spotlight')).toBeInTheDocument();
      expect(screen.getByText("This is the recipient's current number of priority indicators.")).toBeInTheDocument();

      // Verify NoResultsFound component is rendered
      expect(screen.getByText('No results found.')).toBeInTheDocument();
      expect(screen.getByText('There are no current priority indicators for this recipient.')).toBeInTheDocument();
    });
  });

  it('makes API call with correct parameters for different IDs', async () => {
    const recipientId = 5;
    const regionId = 10;
    const spotlightUrl = `/api/recipient-spotlight/recipientId/${recipientId}/regionId/${regionId}?sortBy=recipientName&sortDir=desc&offset=0&limit=10`;
    fetchMock.get(spotlightUrl, mockSpotlightData);

    renderRecipientSpotlight(recipientId, regionId);
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      expect(screen.getByText(/Recipient may need prioritized attention/i)).toBeInTheDocument();
    });
  });

  it('displays indicator descriptions correctly', async () => {
    const spotlightUrl = '/api/recipient-spotlight/recipientId/1/regionId/1?sortBy=recipientName&sortDir=desc&offset=0&limit=10';
    fetchMock.get(spotlightUrl, mockSpotlightData);

    renderRecipientSpotlight();
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      // Verify that descriptions for indicators are visible
      expect(screen.getByText(/Recipient has experienced more than one child incident/i)).toBeInTheDocument();
      expect(screen.getByText(/Recipient is in the first 4 years as a Head Start program/i)).toBeInTheDocument();
      expect(screen.getByText(/Recipient does not have any TTA reports in last 12 months/i)).toBeInTheDocument();
    });
  });

  it('displays NoResultsFound component when API returns empty array', async () => {
    const spotlightUrl = '/api/recipient-spotlight/recipientId/1/regionId/1?sortBy=recipientName&sortDir=desc&offset=0&limit=10';
    fetchMock.get(spotlightUrl, noResultsMockData);

    renderRecipientSpotlight();
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      // Verify header is still present
      expect(screen.getByText('Recipient spotlight')).toBeInTheDocument();
      expect(screen.getByText("This is the recipient's current number of priority indicators.")).toBeInTheDocument();

      // Verify NoResultsFound component is rendered
      expect(screen.getByText('No results found.')).toBeInTheDocument();
      expect(screen.getByText('There are no current priority indicators for this recipient.')).toBeInTheDocument();
    });
  });

  it('displays NoResultsFound component when API call fails with error', async () => {
    const spotlightUrl = '/api/recipient-spotlight/recipientId/1/regionId/1?sortBy=recipientName&sortDir=desc&offset=0&limit=10';
    fetchMock.get(spotlightUrl, { throws: new Error('API error') });

    renderRecipientSpotlight();
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      // Verify header is still present
      expect(screen.getByText('Recipient spotlight')).toBeInTheDocument();
      expect(screen.getByText("This is the recipient's current number of priority indicators.")).toBeInTheDocument();

      // Verify NoResultsFound component is rendered
      expect(screen.getByText('No results found.')).toBeInTheDocument();
      expect(screen.getByText('There are no current priority indicators for this recipient.')).toBeInTheDocument();
    });
  });

  it('sets aria-hidden correctly based on indicator values', async () => {
    const spotlightUrl = '/api/recipient-spotlight/recipientId/1/regionId/1?sortBy=recipientName&sortDir=desc&offset=0&limit=10';
    fetchMock.get(spotlightUrl, mockSpotlightData);

    renderRecipientSpotlight();
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      // In our mockSpotlightData, we have:
      // childIncidents: true, deficiency: false, newRecipients: true,
      // newStaff: false, noTTA: true, DRS: false, FEI: false

      // Check that cells with true values have aria-hidden="false"
      const trueIndicatorCells = document.querySelectorAll('.ttahub-recipient-spotlight-content-cell-bad-indicator');
      trueIndicatorCells.forEach((cell) => {
        expect(cell).toHaveAttribute('aria-hidden', 'false');
      });

      // Check that cells with false values have aria-hidden="true"
      const falseIndicatorCells = document.querySelectorAll('.ttahub-recipient-spotlight-content-cell-good-indicator');
      falseIndicatorCells.forEach((cell) => {
        expect(cell).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });
});
