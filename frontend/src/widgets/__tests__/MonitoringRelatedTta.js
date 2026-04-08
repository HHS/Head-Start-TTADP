import React from 'react';
import {
  render, screen, waitFor, act, fireEvent,
} from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import MonitoringRelatedTta from '../MonitoringRelatedTta';

describe('MonitoringRelatedTta', () => {
  const url = '/api/widgets/monitoringTta?&sortBy=recipient_finding&direction=asc&offset=0';
  beforeEach(() => {
    fetchMock.get(url, { data: [], total: 0 });
  });
  afterEach(() => {
    fetchMock.restore();
  });

  // eslint-disable-next-line max-len
  const renderMonitoringRelatedTta = (filters = []) => render(<BrowserRouter><MonitoringRelatedTta filters={filters} /></BrowserRouter>);

  it('renders nothing while the response is loading', () => {
    fetchMock.restore();
    fetchMock.get(url, new Promise(() => {})); // never resolves
    renderMonitoringRelatedTta();
    expect(screen.queryByText('Monitoring related TTA')).not.toBeInTheDocument();
  });

  it('renders the correct title and subtitle', async () => {
    await act(async () => {
      renderMonitoringRelatedTta();
    });

    expect(fetchMock.called(url)).toBe(true);
    expect(screen.getByText('Monitoring related TTA')).toBeInTheDocument();
    expect(screen.getByText('The date filter applies to the review received date.')).toBeInTheDocument();
  });

  it('renders the sort dropdown with the correct options', async () => {
    await act(async () => {
      renderMonitoringRelatedTta();
    });

    expect(fetchMock.called(url)).toBe(true);
    const dropdown = screen.getByRole('combobox', { name: /sort by/i });
    expect(dropdown).toBeInTheDocument();
    expect(dropdown).toHaveValue('recipient_finding-asc');
    expect(screen.getByRole('option', { name: 'Recipient (A to Z), then Finding type' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Recipient (Z to A), then Finding type' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Recipient (A to Z), then Citation number' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Recipient (Z to A), then Citation number' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Finding category (A to Z), then Citation number' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Finding category (Z to A), then Citation number' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Citation number (low to high), then Recipient' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Citation number (high to low), then Recipient' })).toBeInTheDocument();
  });

  it('updates sort configuration when a new option is selected', async () => {
    await act(async () => {
      renderMonitoringRelatedTta();
    });
    const resortUrl = '/api/widgets/monitoringTta?&sortBy=citation&direction=desc&offset=0';
    expect(fetchMock.called(url)).toBe(true);
    fetchMock.get(resortUrl, { data: [], total: 0 });
    const dropdown = screen.getByRole('combobox', { name: /sort by/i });
    userEvent.selectOptions(dropdown, 'citation-desc');
    await waitFor(() => {
      expect(screen.getByTestId('monitoring-related-tta-sort-container')).toHaveAttribute('data-sortby', 'citation');
      expect(screen.getByTestId('monitoring-related-tta-sort-container')).toHaveAttribute('data-direction', 'desc');
    });

    expect(fetchMock.called(resortUrl)).toBe(true);
  });

  it('renders citation cards for each item in the response data', async () => {
    fetchMock.restore();
    const mockData = [
      {
        recipientName: 'Acme Head Start',
        regionId: 1,
        recipientId: 1001,
        citationNumber: '1304.12(a)(1)',
        status: 'Active',
        findingType: 'Deficiency',
        category: 'Health',
        grantNumbers: ['90HE0001'],
        lastTTADate: '01/01/2025',
        reviews: [
          {
            name: 'Review 2024-01',
            reviewType: 'RAN',
            reviewReceived: '01/01/2024',
            outcome: 'Deficiency',
            findingStatus: 'Active',
            specialists: [{ name: 'Jane Doe', roles: ['Specialist'] }],
            objectives: [
              {
                title: 'Improve health protocols',
                activityReports: [{ id: 1, displayId: 'R01-AR-0001' }],
                endDate: '03/01/2024',
                topics: ['Safety Practices'],
                status: 'Complete',
                participants: ['Doctor', 'scientist'],
              },
            ],
          },
        ],
      },
      {
        recipientName: 'Sunrise Head Start',
        regionId: 1,
        recipientId: 1002,
        citationNumber: '1304.20(b)(3)',
        status: 'Active',
        findingType: 'Noncompliance',
        category: 'Education',
        grantNumbers: ['90HE0002'],
        lastTTADate: '02/01/2025',
        reviews: [
          {
            name: 'Review 2024-02',
            reviewType: 'Follow-up',
            reviewReceived: '02/01/2024',
            outcome: 'Noncompliance',
            findingStatus: 'Active',
            specialists: [{ name: 'John Smith', roles: ['Education Specialist'] }],
            objectives: [
              {
                title: 'Strengthen curriculum delivery',
                activityReports: [{ id: 2, displayId: 'R01-AR-0002' }],
                endDate: '04/01/2024',
                topics: ['Curriculum'],
                status: 'In Progress',
              },
            ],
          },
        ],
      },
    ];
    fetchMock.get(url, { data: mockData, total: 2 });

    await act(async () => {
      renderMonitoringRelatedTta();
    });

    expect(fetchMock.called(url)).toBe(true);
    expect(screen.getAllByTestId('citation-card')).toHaveLength(2);
    expect(screen.getByText('1304.12(a)(1)')).toBeInTheDocument();
    expect(screen.getByText('1304.20(b)(3)')).toBeInTheDocument();
  });

  it('advances to the next page and refetches with the updated offset', async () => {
    fetchMock.restore();
    fetchMock.get(url, { data: [], total: 25 });
    const page2Url = '/api/widgets/monitoringTta?&sortBy=recipient_finding&direction=asc&offset=10';
    fetchMock.get(page2Url, { data: [], total: 25 });

    await act(async () => {
      renderMonitoringRelatedTta();
    });

    const nextPageBtn = await screen.findByRole('button', { name: /next page/i });
    await act(async () => { fireEvent.click(nextPageBtn); });

    await waitFor(() => {
      expect(fetchMock.called(page2Url)).toBe(true);
    });
  });

  it('includes filter query params in the fetch URL', async () => {
    fetchMock.restore();
    const filteredUrl = '/api/widgets/monitoringTta?region.in[]=5&sortBy=recipient_finding&direction=asc&offset=0';
    fetchMock.get(filteredUrl, { data: [], total: 0 });

    await act(async () => {
      renderMonitoringRelatedTta([{ topic: 'region', condition: 'is', query: '5' }]);
    });

    expect(fetchMock.called(filteredUrl)).toBe(true);
  });
});
