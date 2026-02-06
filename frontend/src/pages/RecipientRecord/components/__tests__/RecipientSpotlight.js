import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, waitFor,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import RecipientSpotlight from '../RecipientSpotlight';
import { GrantDataProvider } from '../../pages/GrantDataContext';

// Sample data for tests (wrapped in recipients array to match new API format)
const mockSpotlightData = {
  recipients: [
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
  ],
  overview: {
    numRecipients: '1',
    totalRecipients: '1',
    recipientPercentage: '100%',
  },
};

// Mock data with all indicators set to false
const noIndicatorsMockData = {
  recipients: [{
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
  }],
  overview: {
    numRecipients: '0',
    totalRecipients: '1',
    recipientPercentage: '0%',
  },
};

// Mock empty response
const emptyMockSpotlightData = {
  recipients: [{}],
  overview: {
    numRecipients: '0',
    totalRecipients: '0',
    recipientPercentage: '0%',
  },
};

// Completely empty response (no results)
const noResultsMockData = {
  recipients: [],
  overview: {
    numRecipients: '0',
    totalRecipients: '0',
    recipientPercentage: '0%',
  },
};

describe('RecipientSpotlight', () => {
  const renderRecipientSpotlight = (recipientId = 1, regionId = 1) => {
    render(
      <GrantDataProvider>
        <div data-testid="recipient-spotlight-container">
          <RecipientSpotlight recipientId={recipientId} regionId={regionId} />
        </div>
      </GrantDataProvider>,
    );
  };

  beforeEach(() => fetchMock.restore());

  it('renders the component with header initially', () => {
    renderRecipientSpotlight();

    expect(screen.getByText('Priority indicators')).toBeInTheDocument();
    expect(screen.getByText("This is the recipient's current number of priority indicators.")).toBeInTheDocument();
  });

  it('shows recipient may need prioritized attention when indicators are present', async () => {
    const spotlightUrl = '/api/recipient-spotlight?sortBy=recipientName&direction=asc&offset=0&recipientId.in=1&region.in=1';
    fetchMock.get(spotlightUrl, mockSpotlightData);

    renderRecipientSpotlight();
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      expect(screen.getByText(/Recipient may need prioritized attention/i)).toBeInTheDocument();
      expect(screen.getByText(/3 of 5 priority indicators/i)).toBeInTheDocument();
    });
  });

  it('shows "No priority indicators identified" when no indicators are present', async () => {
    const spotlightUrl = '/api/recipient-spotlight?sortBy=recipientName&direction=asc&offset=0&recipientId.in=1&region.in=1';
    fetchMock.get(spotlightUrl, noIndicatorsMockData);

    renderRecipientSpotlight();
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      expect(screen.getByText(/No priority indicators identified/i)).toBeInTheDocument();
      expect(screen.getByText(/0 of 5 priority indicators/i)).toBeInTheDocument();
    });
  });

  it('displays the correct number of indicators with their states', async () => {
    const spotlightUrl = '/api/recipient-spotlight?sortBy=recipientName&direction=asc&offset=0&recipientId.in=1&region.in=1';
    fetchMock.get(spotlightUrl, mockSpotlightData);

    renderRecipientSpotlight();
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      // Find all indicators with bad-indicator class (true)
      const badIndicators = document.querySelectorAll('.ttahub-recipient-spotlight-content-cell-bad-indicator');
      expect(badIndicators).toHaveLength(3);

      // Find all indicators with good-indicator class (false)
      // FEI and DRS are now hidden, so only 2 good indicators remain (deficiency and newStaff)
      const goodIndicators = document.querySelectorAll('.ttahub-recipient-spotlight-content-cell-good-indicator');
      expect(goodIndicators).toHaveLength(2);
    });

    // Verify specific indicators from our mock data
    expect(screen.getByText('Child incidents')).toBeInTheDocument();
    expect(screen.getByText('New recipients')).toBeInTheDocument();
    expect(screen.getByText('No TTA')).toBeInTheDocument();
  });

  it('handles API error gracefully with NoResultsFound', async () => {
    const spotlightUrl = '/api/recipient-spotlight?sortBy=recipientName&direction=asc&offset=0&recipientId.in=1&region.in=1';
    fetchMock.get(spotlightUrl, 500);

    renderRecipientSpotlight();
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      expect(screen.getByText('Priority indicators')).toBeInTheDocument();
      expect(screen.getByText("This is the recipient's current number of priority indicators.")).toBeInTheDocument();

      expect(screen.getByText('No results found.')).toBeInTheDocument();
      expect(screen.getByText('There are no current priority indicators for this recipient.')).toBeInTheDocument();
    });
  });

  it('handles empty response object gracefully with NoResultsFound', async () => {
    const spotlightUrl = '/api/recipient-spotlight?sortBy=recipientName&direction=asc&offset=0&recipientId.in=1&region.in=1';
    fetchMock.get(spotlightUrl, emptyMockSpotlightData);

    renderRecipientSpotlight();
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      expect(screen.getByText('Priority indicators')).toBeInTheDocument();
      expect(screen.getByText("This is the recipient's current number of priority indicators.")).toBeInTheDocument();

      expect(screen.getByText('No results found.')).toBeInTheDocument();
      expect(screen.getByText('There are no current priority indicators for this recipient.')).toBeInTheDocument();
    });
  });

  it('makes API call with correct parameters for different IDs', async () => {
    const recipientId = 5;
    const regionId = 10;
    const spotlightUrl = `/api/recipient-spotlight?sortBy=recipientName&direction=asc&offset=0&recipientId.in=${recipientId}&region.in=${regionId}`;
    fetchMock.get(spotlightUrl, mockSpotlightData);

    renderRecipientSpotlight(recipientId, regionId);
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      expect(screen.getByText(/Recipient may need prioritized attention/i)).toBeInTheDocument();
    });
  });

  it('displays indicator descriptions correctly', async () => {
    const spotlightUrl = '/api/recipient-spotlight?sortBy=recipientName&direction=asc&offset=0&recipientId.in=1&region.in=1';
    fetchMock.get(spotlightUrl, mockSpotlightData);

    renderRecipientSpotlight();
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      expect(screen.getByText(/Recipient has experienced more than one child incident/i)).toBeInTheDocument();
      expect(screen.getByText(/Recipient is in the first 4 years as a Head Start program/i)).toBeInTheDocument();
      expect(screen.getByText(/Recipient does not have any TTA reports in last 12 months/i)).toBeInTheDocument();
    });
  });

  it('displays NoResultsFound component when API returns empty array', async () => {
    const spotlightUrl = '/api/recipient-spotlight?sortBy=recipientName&direction=asc&offset=0&recipientId.in=1&region.in=1';
    fetchMock.get(spotlightUrl, noResultsMockData);

    renderRecipientSpotlight();
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      expect(screen.getByText('Priority indicators')).toBeInTheDocument();
      expect(screen.getByText("This is the recipient's current number of priority indicators.")).toBeInTheDocument();

      expect(screen.getByText('No results found.')).toBeInTheDocument();
      expect(screen.getByText('There are no current priority indicators for this recipient.')).toBeInTheDocument();
    });
  });

  it('displays NoResultsFound component when API call fails with error', async () => {
    const spotlightUrl = '/api/recipient-spotlight?sortBy=recipientName&direction=asc&offset=0&recipientId.in=1&region.in=1';
    fetchMock.get(spotlightUrl, { throws: new Error('API error') });

    renderRecipientSpotlight();
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      expect(screen.getByText('Priority indicators')).toBeInTheDocument();
      expect(screen.getByText("This is the recipient's current number of priority indicators.")).toBeInTheDocument();

      expect(screen.getByText('No results found.')).toBeInTheDocument();
      expect(screen.getByText('There are no current priority indicators for this recipient.')).toBeInTheDocument();
    });
  });

  it('applies correct CSS classes based on indicator values', async () => {
    const spotlightUrl = '/api/recipient-spotlight?sortBy=recipientName&direction=asc&offset=0&recipientId.in=1&region.in=1';
    fetchMock.get(spotlightUrl, mockSpotlightData);

    renderRecipientSpotlight();
    expect(fetchMock.called(spotlightUrl)).toBe(true);

    await waitFor(() => {
      // In our mockSpotlightData, we have:
      // childIncidents: true, deficiency: false, newRecipients: true,
      // newStaff: false, noTTA: true

      // Check that cells with true values get the bad-indicator class
      const trueIndicatorCells = document.querySelectorAll('.ttahub-recipient-spotlight-content-cell-bad-indicator');
      expect(trueIndicatorCells).toHaveLength(3);

      // Check that cells with false values get the good-indicator class
      const falseIndicatorCells = document.querySelectorAll('.ttahub-recipient-spotlight-content-cell-good-indicator');
      expect(falseIndicatorCells).toHaveLength(2);
    });
  });
});
