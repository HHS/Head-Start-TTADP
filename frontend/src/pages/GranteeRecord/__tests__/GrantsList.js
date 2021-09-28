import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import GrantsList from '../components/GrantsList';

const renderGrantsList = (summary) => {
  render(<GrantsList summary={summary} skipLoading />);
};

describe('Grants List Widget', () => {
  it('renders correctly without data', async () => {
    const summaryData = [];
    renderGrantsList({ summaryData });
    expect(await screen.findByRole('heading', { name: /grants/i })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: /status/i })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: /programs/i })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: /project end date/i })).toBeInTheDocument();
  });
  it('renders correctly with data', async () => {
    const summaryData = [
      {
        name: 'Test Grantee',
        grantsToReturn: [
          {
            status: 'Active',
            programTypes: [],
            endDate: '2021-09-28',
          },
        ],
      },
    ];
    renderReasonList({ summaryData });
    screen.debug(undefined, 100000);
    expect(true).toBe(false);
    /*
    expect(screen.getByText(/reasons in activity reports/i)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /reason/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /# of activities/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /reason one/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /4/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /reason two/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /2/i })).toBeInTheDocument();
    */
  });

  /*

    it('renders large reason and count', async () => {
      const data = [
        { name: 'reason one', count: 10 },
        { name: 'reason two', count: 9 },
        { name: 'reason three', count: 8 },
        { name: 'reason four', count: 7 },
        { name: 'reason five', count: 6 },
        { name: 'reason six', count: 5 },
        { name: 'reason seven', count: 4 },
        { name: 'reason 8', count: 3 },
        { name: 'reason 9', count: 2 },
        { name: 'reason 10 is a very very very long reason and should not cut off the text', count: 999999 },
      ];
      renderReasonList({ data });

      expect(screen.getByText(/reasons in activity reports/i)).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /reason/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /# of activities/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /reason 10 is a very very very long reason and should not cut off the text/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /999,999/i })).toBeInTheDocument();
    });
    */
});
