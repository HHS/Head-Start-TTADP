import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router';
import { blobToCsvDownload } from '../../../../utils';
import CompliantFollowUpsTable, {
  formatActivityReportsForExport,
} from '../CompliantFollowUpsTable';

jest.mock('../../../../utils', () => {
  const actual = jest.requireActual('../../../../utils');
  return {
    ...actual,
    blobToCsvDownload: jest.fn(),
  };
});

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

const readBlobAsText = (blob) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(blob);
  });

describe('CompliantFollowUpsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    blobToCsvDownload.mockClear();
    mockUseFetch.mockReturnValue({ data: [], loading: false, error: null });
  });

  describe('unit behavior', () => {
    it('formats key table cells with links, citation renderers, and fallback values', () => {
      mockUseFetch.mockReturnValue({
        data: [
          {
            reviewId: 91001,
            reviewName: 'Compliant Follow-Up Review',
            recipientName: 'Alpha Head Start',
            recipientId: 44,
            regionId: 2,
            grantsOnReview: ['G-1 - EHS', 'G-2 - HS', 'LONG-GRANT - AIAN EHS, AIAN HS'],
            citationNumbers: ['1302.12', '1302.34'],
            hasTta: true,
            lastTtaDate: '2026-01-20',
            associatedActivityReports: [
              { id: 1, displayId: 'LEGACY-AR-1', regionId: 2 },
              { id: 2, displayId: 'R02-AR-2', regionId: 2 },
            ],
            compliantFollowUpReviewReceivedDate: '2026-01-30',
            initialReviews: [
              {
                reviewId: 81001,
                reviewName: 'Initial Review',
                reviewReceivedDate: '2025-12-15',
              },
            ],
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
      expect(screen.getByText('citation-1302.12')).toBeInTheDocument();
      expect(screen.getByText('citation-1302.34')).toBeInTheDocument();
      const ehsGrant = screen.getByText('G-1 - EHS');
      const hsGrant = screen.getByText('G-2 - HS');
      const firstLongGrantSegment = screen.getByText('LONG-GRANT - AIAN EHS,');
      const secondLongGrantSegment = screen.getByText('AIAN HS');

      expect(ehsGrant).toHaveClass('text-no-wrap');
      expect(hsGrant).toHaveClass('text-no-wrap');
      expect(ehsGrant.parentElement).toHaveClass('text-wrap');
      expect(hsGrant.parentElement).toHaveClass('text-wrap');
      expect(ehsGrant.parentElement.tagName).toBe('DIV');
      expect(hsGrant.parentElement.tagName).toBe('DIV');
      expect(firstLongGrantSegment).toHaveClass('text-no-wrap');
      expect(secondLongGrantSegment).toHaveClass('text-no-wrap');
      expect(firstLongGrantSegment.parentElement).toBe(secondLongGrantSegment.parentElement);
      expect(firstLongGrantSegment.parentElement).toHaveClass('text-wrap');
      expect(screen.getByText('citation-1302.12').parentElement.tagName).toBe('DIV');
      expect(screen.getByText('citation-1302.34').parentElement.tagName).toBe('DIV');
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'LEGACY-AR-1' })).toHaveAttribute(
        'href',
        '/activity-reports/view/1'
      );
      expect(screen.getByRole('link', { name: 'R02-AR-2' })).toHaveAttribute(
        'href',
        '/activity-reports/view/2'
      );
      expect(screen.getByRole('link', { name: 'LEGACY-AR-1' }).parentElement.tagName).toBe('DIV');
      expect(screen.getByRole('link', { name: 'R02-AR-2' }).parentElement.tagName).toBe('DIV');
      expect(screen.getByRole('link', { name: 'LEGACY-AR-1' }).parentElement).toHaveClass(
        'text-no-wrap'
      );
      expect(screen.getByRole('link', { name: 'R02-AR-2' }).parentElement).toHaveClass(
        'text-no-wrap'
      );
      expect(screen.getByText('Compliant Follow-Up Review')).toBeInTheDocument();
      expect(screen.getByText('Initial Review')).toBeInTheDocument();
      expect(screen.getByText('01/20/2026')).toBeInTheDocument();
      expect(screen.getByText('01/30/2026')).toBeInTheDocument();
      expect(screen.getByText('12/15/2025')).toBeInTheDocument();
      expect(screen.queryByText('Invalid date')).not.toBeInTheDocument();
    });

    it('uses public review IDs for follow-up reviews but not initial reviews when review names are missing', () => {
      mockUseFetch.mockReturnValue({
        data: [
          {
            reviewId: 91002,
            reviewName: null,
            recipientName: 'Alpha Head Start',
            regionId: 2,
            grantsOnReview: [],
            citationNumbers: [],
            hasTta: false,
            associatedActivityReports: [],
            initialReviews: [
              {
                reviewId: 81002,
                reviewName: null,
                reviewReceivedDate: null,
              },
            ],
          },
        ],
        loading: false,
        error: null,
      });

      renderWithRouter(<CompliantFollowUpsTable />);

      expect(screen.getByText('91002')).toBeInTheDocument();
      expect(screen.queryByText('81002')).not.toBeInTheDocument();
    });

    it('formats activity report IDs for selected-row exports exactly as they appear in the UI', () => {
      expect(
        formatActivityReportsForExport(
          [1, 'AR-2', 'R03-AR-3', { id: 4, regionId: 4 }, { id: 5, displayId: 'LEGACY-AR-5' }],
          2
        )
      ).toBe('R02-AR-1\nR02-AR-2\nR03-AR-3\nR04-AR-4\nLEGACY-AR-5');
    });

    it('shows empty state when there is no data and no error', () => {
      const { container } = renderWithRouter(<CompliantFollowUpsTable />);

      expect(screen.getByText('No results found.')).toBeInTheDocument();
      expect(
        screen.getByText('Try removing or changing the selected filters.')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Get help using filters' })).toBeInTheDocument();
      expect(container.querySelector('[data-icon="chart-column"]')).toBeInTheDocument();
      expect(screen.queryByTestId('pagination-card-count-header')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Select per page')).not.toBeInTheDocument();
    });

    it('shows 10 rows by default and allows the page size to be changed', async () => {
      mockUseFetch.mockReturnValue({
        data: Array.from({ length: 11 }, (_, index) => ({
          reviewId: index + 1,
          reviewName: `Review ${String(index + 1).padStart(2, '0')}`,
          recipientName: `Recipient ${String(index + 1).padStart(2, '0')}`,
          recipientId: index + 1,
          regionId: 1,
          grantsOnReview: [],
          citationNumbers: [],
          hasTta: false,
          associatedActivityReports: [],
        })),
        loading: false,
        error: null,
      });

      const { container } = renderWithRouter(<CompliantFollowUpsTable />);
      const perPageSelect = screen.getByLabelText('Select per page');

      expect(perPageSelect).toHaveDisplayValue('10');
      expect(perPageSelect.closest('.smart-hub--pagination-card')).toHaveClass('margin-bottom-2');
      expect(perPageSelect.closest('.smart-hub--pagination-card')).not.toHaveClass(
        'margin-bottom-4'
      );
      expect(screen.getAllByRole('navigation', { name: 'Pagination' })).toHaveLength(1);
      expect(container.querySelectorAll('tbody tr')).toHaveLength(10);

      await userEvent.selectOptions(perPageSelect, '25');

      expect(container.querySelectorAll('tbody tr')).toHaveLength(11);
    });

    it('keeps showing all rows when refreshed results increase', async () => {
      const makeRows = (count) =>
        Array.from({ length: count }, (_, index) => ({
          reviewId: index + 1,
          reviewName: `Review ${String(index + 1).padStart(2, '0')}`,
          recipientName: `Recipient ${String(index + 1).padStart(2, '0')}`,
          recipientId: index + 1,
          regionId: 1,
          grantsOnReview: [],
          citationNumbers: [],
          hasTta: false,
          associatedActivityReports: [],
        }));

      mockUseFetch.mockReturnValue({ data: makeRows(11), loading: false, error: null });

      const { container, history, rerender } = renderWithRouter(<CompliantFollowUpsTable />);
      await userEvent.selectOptions(screen.getByLabelText('Select per page'), 'all');

      expect(container.querySelectorAll('tbody tr')).toHaveLength(11);

      mockUseFetch.mockReturnValue({ data: makeRows(20), loading: false, error: null });
      rerender(
        <Router history={history}>
          <CompliantFollowUpsTable />
        </Router>
      );

      await waitFor(() => expect(container.querySelectorAll('tbody tr')).toHaveLength(20));
      expect(screen.getByLabelText('Select per page')).toHaveDisplayValue('all');
    });

    it('renders the received-date sort control in a bottom-aligned sortable header', () => {
      mockUseFetch.mockReturnValue({
        data: [
          {
            reviewId: 1,
            reviewName: 'Review 1',
            recipientName: 'Recipient 1',
            recipientId: 1,
            regionId: 1,
            grantsOnReview: [],
            citationNumbers: [],
            hasTta: false,
            associatedActivityReports: [],
          },
        ],
        loading: false,
        error: null,
      });

      renderWithRouter(<CompliantFollowUpsTable />);

      const sortButton = screen.getByRole('button', {
        name: /Compliant follow-up review received date\. Activate to sort ascending/i,
      });
      expect(sortButton).toHaveClass('sortable');
      expect(sortButton.closest('th')).toHaveClass('data-header');
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
        ['region.in[]=1'],
        'Unable to fetch compliant follow-up review details',
        true
      );

      const fetchCallback = mockUseFetch.mock.calls[0][1];
      await fetchCallback();
      expect(mockGetCompliantFollowUpReviewsDetails).toHaveBeenCalledWith('region.in[]=1');
    });

    it('repairs a bookmarked display-formatted date before serializing the API query and URL', async () => {
      const { history } = renderWithRouter(
        <CompliantFollowUpsTable />,
        '/dashboards/regional-dashboard/monitoring-report/compliant-follow-up-reviews?startDate.win=07%2F01%2F2026-07%2F08%2F2026'
      );

      expect(mockUseFetch).toHaveBeenCalledWith(
        [],
        expect.any(Function),
        [
          'startDate.win=2026%2F07%2F01-2026%2F07%2F08&completeDate.win=2026%2F07%2F01-2026%2F07%2F08',
        ],
        'Unable to fetch compliant follow-up review details',
        true
      );

      const fetchCallback = mockUseFetch.mock.calls[0][1];
      await fetchCallback();
      expect(mockGetCompliantFollowUpReviewsDetails).toHaveBeenCalledWith(
        'startDate.win=2026%2F07%2F01-2026%2F07%2F08&completeDate.win=2026%2F07%2F01-2026%2F07%2F08'
      );

      await waitFor(() =>
        expect(history.location.search).toBe(
          '?startDate.win=2026%2F07%2F01-2026%2F07%2F08&completeDate.win=2026%2F07%2F01-2026%2F07%2F08'
        )
      );
    });

    it('removes invalid bookmarked date filters before rendering pills or fetching data', async () => {
      const { history } = renderWithRouter(
        <CompliantFollowUpsTable />,
        '/dashboards/regional-dashboard/monitoring-report/compliant-follow-up-reviews?startDate.win=Invalid%20date-Invalid%20date'
      );

      expect(mockUseFetch).toHaveBeenCalledWith(
        [],
        expect.any(Function),
        [''],
        'Unable to fetch compliant follow-up review details',
        true
      );

      const fetchCallback = mockUseFetch.mock.calls[0][1];
      await fetchCallback();
      expect(mockGetCompliantFollowUpReviewsDetails).toHaveBeenCalledWith('');

      expect(screen.queryByText('Invalid date-Invalid date')).not.toBeInTheDocument();
      expect(screen.queryByText('Date')).not.toBeInTheDocument();
      await waitFor(() => expect(history.location.search).toBe(''));
    });

    it('does not display region filter pills', () => {
      renderWithRouter(
        <CompliantFollowUpsTable />,
        '/dashboards/regional-dashboard/monitoring-report/compliant-follow-up-reviews?region.in%5B%5D=1'
      );

      expect(screen.queryByRole('button', { name: /removes the filter/i })).not.toBeInTheDocument();
    });

    it('shows date filter pills without allowing filters to be removed', () => {
      renderWithRouter(
        <CompliantFollowUpsTable />,
        '/dashboards/regional-dashboard/monitoring-report/compliant-follow-up-reviews?startDate.win=07%2F01%2F2026-07%2F08%2F2026&reportDeliveryDate.win=2026%2F07%2F01-2026%2F07%2F08'
      );

      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('07/01/2026-07/08/2026')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /removes the filter/i })).not.toBeInTheDocument();
    });

    it('shows each distinct date filter pill on the read-only details page', () => {
      renderWithRouter(
        <CompliantFollowUpsTable />,
        '/dashboards/regional-dashboard/monitoring-report/compliant-follow-up-reviews?startDate.win=07%2F01%2F2026-07%2F08%2F2026&startDate.win=08%2F01%2F2026-08%2F08%2F2026'
      );

      expect(screen.getAllByText('Date')).toHaveLength(2);
      expect(screen.getByText('07/01/2026-07/08/2026')).toBeInTheDocument();
      expect(screen.getByText('08/01/2026-08/08/2026')).toBeInTheDocument();
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
        screen.getByRole('button', { name: /Recipient\. Activate to sort ascending/i })
      );
      fireEvent.click(
        screen.getByRole('button', { name: /Recipient\. Activate to sort descending/i })
      );

      expect(getRecipientOrder()).toEqual(['Zulu Recipient', 'Alpha Recipient']);
    });

    it('sorts the first sortable column by its displayed review name, not an internal ID', () => {
      mockUseFetch.mockReturnValue({
        data: [
          {
            reviewId: 900,
            reviewName: 'Zulu Review',
            recipientName: 'Alpha Recipient',
            recipientId: 20,
            regionId: 1,
            hasTta: false,
            citationNumbers: [],
            grantsOnReview: [],
            compliantFollowUpReviewReceivedDate: '2026-01-01',
          },
          {
            reviewId: 100,
            reviewName: 'Alpha Review',
            recipientName: 'Zulu Recipient',
            recipientId: 3,
            regionId: 1,
            hasTta: false,
            citationNumbers: [],
            grantsOnReview: [],
            compliantFollowUpReviewReceivedDate: '2026-12-31',
          },
        ],
        loading: false,
        error: null,
      });

      const { container } = renderWithRouter(<CompliantFollowUpsTable />);

      const getReviewOrder = () =>
        Array.from(container.querySelectorAll('tbody tr td:nth-child(2)')).map((cell) =>
          cell.textContent?.trim()
        );

      expect(getReviewOrder()).toEqual(['Zulu Review', 'Alpha Review']);

      fireEvent.click(
        screen.getByRole('button', {
          name: /Compliant follow-up review\. Activate to sort ascending/i,
        })
      );

      expect(getReviewOrder()).toEqual(['Alpha Review', 'Zulu Review']);
    });

    it('applies the default sort by Had TTA, Recipient, then review received date', async () => {
      mockUseFetch.mockReturnValue({
        data: [
          {
            reviewId: 1,
            reviewName: 'No TTA Review',
            recipientName: 'Aaron Recipient',
            recipientId: 1,
            regionId: 1,
            hasTta: false,
            citationNumbers: [],
            grantsOnReview: [],
            compliantFollowUpReviewReceivedDate: '2026-12-31',
          },
          {
            reviewId: 2,
            reviewName: 'Alpha Older Review',
            recipientName: 'Alpha Recipient',
            recipientId: 2,
            regionId: 1,
            hasTta: true,
            citationNumbers: [],
            grantsOnReview: [],
            compliantFollowUpReviewReceivedDate: '2026-01-01',
          },
          {
            reviewId: 3,
            reviewName: 'Bravo Review',
            recipientName: 'Bravo Recipient',
            recipientId: 3,
            regionId: 1,
            hasTta: true,
            citationNumbers: [],
            grantsOnReview: [],
            compliantFollowUpReviewReceivedDate: '2026-06-01',
          },
          {
            reviewId: 4,
            reviewName: 'Alpha Newer Review',
            recipientName: 'Alpha Recipient',
            recipientId: 4,
            regionId: 1,
            hasTta: true,
            citationNumbers: [],
            grantsOnReview: [],
            compliantFollowUpReviewReceivedDate: '2026-03-01',
          },
        ],
        loading: false,
        error: null,
      });

      const { container } = renderWithRouter(<CompliantFollowUpsTable />);

      const getReviewOrder = () =>
        Array.from(container.querySelectorAll('tbody tr td:nth-child(2)')).map((cell) =>
          cell.textContent?.trim()
        );

      await waitFor(() =>
        expect(getReviewOrder()).toEqual([
          'Alpha Newer Review',
          'Alpha Older Review',
          'Bravo Review',
          'No TTA Review',
        ])
      );
    });

    it('exports table rows in the current table order', async () => {
      mockUseFetch.mockReturnValue({
        data: [
          {
            reviewId: 1,
            reviewName: 'Alpha Review',
            recipientName: 'Alpha Recipient',
            recipientId: 1,
            regionId: 1,
            hasTta: true,
            citationNumbers: [],
            grantsOnReview: [],
            compliantFollowUpReviewReceivedDate: '2026-01-01',
          },
          {
            reviewId: 2,
            reviewName: 'Zulu Review',
            recipientName: 'Zulu Recipient',
            recipientId: 2,
            regionId: 1,
            hasTta: true,
            citationNumbers: [],
            grantsOnReview: [],
            compliantFollowUpReviewReceivedDate: '2026-02-01',
          },
        ],
        loading: false,
        error: null,
      });

      renderWithRouter(<CompliantFollowUpsTable />);

      fireEvent.click(
        screen.getByRole('button', { name: /Recipient\. Activate to sort ascending/i })
      );
      fireEvent.click(
        screen.getByRole('button', { name: /Recipient\. Activate to sort descending/i })
      );
      fireEvent.click(
        screen.getByRole('button', {
          name: /Open Actions for Compliant follow-up reviews with TTA support/i,
        })
      );
      fireEvent.click(screen.getByRole('button', { name: 'Export table' }));

      await waitFor(() => expect(blobToCsvDownload).toHaveBeenCalled());

      const [blob, filename] = blobToCsvDownload.mock.calls[0];
      const csv = await readBlobAsText(blob);
      const exportedRowHeadings = csv
        .split('\n')
        .slice(1)
        .map((row) => row.split(',')[0]);

      expect(filename).toBe('compliant-follow-up-reviews.csv');
      expect(exportedRowHeadings).toEqual(['Zulu Review', 'Alpha Review']);
    });

    it('uses row IDs, not public review IDs, for selected-row export identity', async () => {
      mockUseFetch.mockReturnValue({
        data: [
          {
            rowId: 'cfu-family-row-a',
            reviewId: 12345,
            reviewName: 'Same Review',
            recipientName: 'Alpha Recipient',
            recipientId: 1,
            regionId: 1,
            hasTta: true,
            citationNumbers: ['1302.12(a)'],
            grantsOnReview: [],
            compliantFollowUpReviewReceivedDate: '2026-01-01',
          },
          {
            rowId: 'cfu-family-row-b',
            reviewId: 12345,
            reviewName: 'Same Review',
            recipientName: 'Bravo Recipient',
            recipientId: 2,
            regionId: 1,
            hasTta: true,
            citationNumbers: ['1302.12(b)'],
            grantsOnReview: [],
            compliantFollowUpReviewReceivedDate: '2026-01-02',
          },
        ],
        loading: false,
        error: null,
      });

      renderWithRouter(<CompliantFollowUpsTable />);

      const rowCheckboxes = screen.getAllByLabelText('Select Same Review');
      expect(rowCheckboxes.map((checkbox) => checkbox.id)).toEqual([
        'cfu-family-row-a',
        'cfu-family-row-b',
      ]);

      fireEvent.click(rowCheckboxes[0]);
      fireEvent.click(
        screen.getByRole('button', {
          name: /Open Actions for Compliant follow-up reviews with TTA support/i,
        })
      );
      fireEvent.click(screen.getByRole('button', { name: 'Export selected rows' }));

      await waitFor(() => expect(blobToCsvDownload).toHaveBeenCalled());

      const [blob] = blobToCsvDownload.mock.calls[0];
      const csv = await readBlobAsText(blob);
      expect(csv).toContain('Alpha Recipient');
      expect(csv).not.toContain('Bravo Recipient');
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
