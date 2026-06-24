import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import RecipientTrainingReportsTable from '../RecipientTrainingReportsTable';

const renderTable = (filters = []) =>
  render(
    <MemoryRouter>
      <RecipientTrainingReportsTable filters={filters} />
    </MemoryRouter>
  );

describe('RecipientTrainingReportsTable', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it('renders the table title', async () => {
    fetchMock.get(/\/api\/session-reports.*/, { count: 0, rows: [] });
    renderTable();
    expect(await screen.findByText('Approved training reports')).toBeInTheDocument();
  });

  it('shows the empty message when no sessions are returned', async () => {
    fetchMock.get(/\/api\/session-reports.*/, { count: 0, rows: [] });
    renderTable();
    expect(await screen.findByText('No training reports found')).toBeInTheDocument();
  });

  it('makes an API request that includes the recipientId filter', async () => {
    fetchMock.get(/\/api\/session-reports.*/, { count: 0, rows: [] });

    const filters = [
      { topic: 'recipientId', condition: 'contains', query: '401' },
      { topic: 'region', condition: 'is', query: '1' },
    ];

    renderTable(filters);

    await waitFor(() => {
      const calls = fetchMock.calls().map(([url]) => url);
      expect(calls.some((url) => url.includes('recipientId.ctn%5B%5D=401') || url.includes('recipientId.ctn[]=401'))).toBe(true);
    });
  });

  it('renders a row for each returned session', async () => {
    fetchMock.get(/\/api\/session-reports.*/, {
      count: 1,
      rows: [
        {
          id: 1,
          eventId: 'R01-PD-25-1234',
          eventName: 'Test Event',
          sessionName: 'Session One',
          startDate: '2025-01-15',
          endDate: '2025-01-16',
          objectiveTopics: ['Topic A'],
          goalTemplates: [],
          recipients: [{ label: 'Test Recipient' }],
          participants: [],
          duration: 1,
        },
      ],
    });

    renderTable();

    expect(await screen.findByText('R01-PD-25-1234')).toBeInTheDocument();
    expect(screen.getAllByText('Test Event').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Session One').length).toBeGreaterThan(0);
  });
});
