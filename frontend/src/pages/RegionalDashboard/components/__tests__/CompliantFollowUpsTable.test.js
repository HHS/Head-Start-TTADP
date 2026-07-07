import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router';
import CompliantFollowUpsTable from '../CompliantFollowUpsTable';

const mockUseFetch = jest.fn();
jest.mock(
  '../../../../hooks/useFetch',
  () =>
    (...args) =>
      mockUseFetch(...args)
);

const mockGetCompliantFollowUpReviewsDetails = jest.fn();
jest.mock('../../../../fetchers/monitoring', () => ({
  getCompliantFollowUpReviewsDetails: (...args) => mockGetCompliantFollowUpReviewsDetails(...args),
}));

jest.mock('../../../../components/ContentFromFeedByTag', () => ({ tagName }) => (
  <div data-testid="feed-content">{tagName}</div>
));

jest.mock(
  '../../../RecipientRecord/pages/Monitoring/components/CitationDrawer',
  () =>
    ({ citationNumber }) => <span>citation-{citationNumber}</span>
);

const renderWithRouter = (
  ui,
  initialRoute = '/dashboards/regional-dashboard/monitoring-report/compliant-follow-up-reviews'
) => {
  const history = createMemoryHistory({
    initialEntries: [initialRoute],
  });

  const result = render(<Router history={history}>{ui}</Router>);
  return { ...result, history };
};

describe('CompliantFollowUpsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetch.mockReturnValue({ data: [], loading: false, error: null });
  });

  describe('unit behavior', () => {
    it('formats key table cells with links, citation renderers, and fallback values', () => {
      mockUseFetch.mockReturnValue({
        data: [
          {
            id: 101,
            recipientName: 'Alpha Head Start',
            recipientId: 44,
            regionId: 2,
            grantsOnReview: ['G-1', 'G-2'],
            citationNumbers: ['1302.12', '1302.34'],
            hasTta: true,
            lastTtaDate: '2026-01-20',
            associatedActivityReports: ['AR-1', 'AR-2'],
            compliantFollowUpReviewReceivedDate: '2026-01-30',
            initialReviewReceivedDate: null,
            initialReviewId: null,
          },
        ],
        loading: false,
        error: null,
      });

      renderWithRouter(<CompliantFollowUpsTable />);

      expect(screen.getByRole('link', { name: 'Alpha Head Start' })).toHaveAttribute(
        'href',
        '/recipient-tta-records/44/region/2/profile'
      );
      expect(screen.getByText('G-1, G-2')).toBeInTheDocument();
      expect(screen.getByText('citation-1302.12')).toBeInTheDocument();
      expect(screen.getByText('citation-1302.34')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'AR-1' })).toHaveAttribute(
        'href',
        '/activity-reports/view/AR-1'
      );
      expect(screen.getByRole('link', { name: 'AR-2' })).toHaveAttribute(
        'href',
        '/activity-reports/view/AR-2'
      );
      expect(screen.getAllByText('--').length).toBeGreaterThan(0);
    });

    it('shows empty state when there is no data and no error', () => {
      renderWithRouter(<CompliantFollowUpsTable />);

      expect(screen.getByText('No compliant follow-up review details found.')).toBeInTheDocument();
    });
  });

  describe('integration behavior', () => {
    it('passes location query into useFetch dependency array and fetch callback', async () => {
      renderWithRouter(
        <CompliantFollowUpsTable />,
        '/dashboards/regional-dashboard/monitoring-report/compliant-follow-up-reviews?region.in%5B%5D=1'
      );

      expect(mockUseFetch).toHaveBeenCalledWith(
        [],
        expect.any(Function),
        ['region.in%5B%5D=1'],
        'Unable to fetch compliant follow-up review details',
        true
      );

      const fetchCallback = mockUseFetch.mock.calls[0][1];
      await fetchCallback();
      expect(mockGetCompliantFollowUpReviewsDetails).toHaveBeenCalledWith('region.in%5B%5D=1');
    });

    it('removes selected filter and updates the URL search params', () => {
      const { history } = renderWithRouter(
        <CompliantFollowUpsTable />,
        '/dashboards/regional-dashboard/monitoring-report/compliant-follow-up-reviews?region.in%5B%5D=1'
      );

      fireEvent.click(screen.getByRole('button', { name: /removes the filter/i }));

      expect(history.location.search).toBe('?');
    });

    it('updates sort order when the recipient header sort control is used', () => {
      mockUseFetch.mockReturnValue({
        data: [
          {
            id: 1,
            recipientName: 'Alpha Recipient',
            recipientId: 11,
            regionId: 1,
            hasTta: true,
            citationNumbers: [],
            grantsOnReview: [],
          },
          {
            id: 2,
            recipientName: 'Zulu Recipient',
            recipientId: 22,
            regionId: 1,
            hasTta: false,
            citationNumbers: [],
            grantsOnReview: [],
          },
        ],
        loading: false,
        error: null,
      });

      const { container } = renderWithRouter(<CompliantFollowUpsTable />);

      const getRecipientOrder = () =>
        Array.from(container.querySelectorAll('tbody a[href^="/recipient-tta-records/"]')).map(
          (link) => link.textContent?.trim()
        );

      expect(getRecipientOrder()).toEqual(['Alpha Recipient', 'Zulu Recipient']);

      fireEvent.click(
        screen.getByRole('button', { name: /Recipient\. Activate to sort descending/i })
      );

      expect(getRecipientOrder()).toEqual(['Zulu Recipient', 'Alpha Recipient']);
    });

    it('shows an error alert when useFetch returns an error', () => {
      mockUseFetch.mockReturnValue({
        data: [],
        loading: false,
        error: 'Unable to load data',
      });

      renderWithRouter(<CompliantFollowUpsTable />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Unable to load data')).toBeInTheDocument();
    });
  });
});
