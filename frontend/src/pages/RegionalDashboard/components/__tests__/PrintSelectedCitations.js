import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PrintSelectedCitations from '../PrintSelectedCitations';
import fetchWidget from '../../../../fetchers/Widgets';

jest.mock('../../../../fetchers/Widgets');

const mockUseLocation = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => mockUseLocation(),
}));

const mockCitation = {
  id: 999,
  citationId: 101,
  recipientId: 1001,
  recipientName: 'Bright Beginnings Early Learning Center',
  citationNumber: '1302.42(b)(1)(i)',
  status: 'Corrected',
  findingType: 'Deficiency',
  category: 'Health',
  grantNumbers: ['14HP177736 - EHS'],
  lastTTADate: '06/06/2025',
  reviews: [
    {
      name: '251036FU',
      reviewType: 'Follow-up',
      reviewReceived: '07/21/2025',
      outcome: 'Compliant',
      specialists: [],
      objectives: [],
    },
  ],
};

const mockCitation2 = {
  citationId: 102,
  recipientId: 1002,
  recipientName: 'Sunrise Head Start',
  citationNumber: '1304.20(b)(3)',
  status: 'Active',
  findingType: 'Noncompliance',
  category: 'Education',
  grantNumbers: ['90HE0002'],
  lastTTADate: null,
  reviews: [],
};

const defaultLocationState = {
  selectedIds: ['999'],
  sortConfig: { sortBy: 'recipient_finding', direction: 'asc' },
  filters: [],
};

const renderComponent = () => render(
  <BrowserRouter>
    <PrintSelectedCitations />
  </BrowserRouter>,
);

describe('PrintSelectedCitations', () => {
  beforeEach(() => {
    mockUseLocation.mockReturnValue({ state: defaultLocationState });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially while fetch is pending', async () => {
    // Never resolve the fetch so we stay in loading state
    fetchWidget.mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('does not call fetchWidget when selectedIds is empty', async () => {
    mockUseLocation.mockReturnValue({
      state: { ...defaultLocationState, selectedIds: [] },
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No citations found')).toBeInTheDocument();
    });
    expect(fetchWidget).not.toHaveBeenCalled();
    expect(screen.getByText(/No matching citations were found/i)).toBeInTheDocument();
  });

  it('includes selectedIds in the fetchWidget query', async () => {
    fetchWidget.mockResolvedValue({ data: [mockCitation], total: 1 });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Bright Beginnings Early Learning Center')).toBeInTheDocument();
    });
    expect(fetchWidget).toHaveBeenCalledWith(
      'monitoringTta',
      expect.stringContaining('id.in[]=999'),
    );
  });

  it('renders all citations when all IDs are selected', async () => {
    mockUseLocation.mockReturnValue({
      state: {
        ...defaultLocationState,
        selectedIds: ['101-1001', '102-1002'],
      },
    });
    fetchWidget.mockResolvedValue({ data: [mockCitation, mockCitation2], total: 2 });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Bright Beginnings Early Learning Center')).toBeInTheDocument();
    });
    expect(screen.getByText('Sunrise Head Start')).toBeInTheDocument();
  });

  it('renders BackLink pointing to the monitoring dashboard', async () => {
    fetchWidget.mockResolvedValue({ data: [mockCitation], total: 1 });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Bright Beginnings Early Learning Center')).toBeInTheDocument();
    });
    const backLink = screen.getByRole('link', { name: /back to regional monitoring dashboard/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/dashboards/regional-dashboard/monitoring');
  });

  it('renders the Print to PDF button', async () => {
    fetchWidget.mockResolvedValue({ data: [mockCitation], total: 1 });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Bright Beginnings Early Learning Center')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /print to pdf/i })).toBeInTheDocument();
  });

  it('shows info alert when API returns no citations for the selected IDs', async () => {
    mockUseLocation.mockReturnValue({
      state: {
        selectedIds: ['999-999'],
        sortConfig: { sortBy: 'recipient_finding', direction: 'asc' },
        filters: [],
      },
    });
    fetchWidget.mockResolvedValue({ data: [], total: 0 });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No citations found')).toBeInTheDocument();
    });
    expect(screen.getByText(/No matching citations were found/i)).toBeInTheDocument();
  });

  it('shows info alert when API returns empty data', async () => {
    fetchWidget.mockResolvedValue({ data: [], total: 0 });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No citations found')).toBeInTheDocument();
    });
    expect(screen.getByText(/No matching citations were found/i)).toBeInTheDocument();
  });

  it('renders the empty alert gracefully when location state is null', async () => {
    mockUseLocation.mockReturnValue({ state: null });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No citations found')).toBeInTheDocument();
    });
    expect(fetchWidget).not.toHaveBeenCalled();
    expect(screen.getByText(/No matching citations were found/i)).toBeInTheDocument();
  });
});
