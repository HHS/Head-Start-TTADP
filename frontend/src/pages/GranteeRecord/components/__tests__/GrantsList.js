import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import GrantsList from '../GrantsList';

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
    const summary = {
      name: 'Test Grantee',
      grants: [
        {
          name: 'Grant Name 1',
          number: 'Grant Number 1',
          status: 'Active',
          programTypes: ['Early Head Start (ages 0-3)', 'Head Start (ages 3-5)'],
          endDate: '2021-09-28',
          id: 1,
        },
        {
          name: 'Grant Name 2',
          number: 'Grant Number 2',
          status: 'Inactive',
          programTypes: ['EHS-CCP'],
          endDate: '2021-10-01',
        },
      ],
    };
    renderGrantsList(summary);
    expect(await screen.findByRole('heading', { name: /grants/i })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: /status/i })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: /programs/i })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: /project end date/i })).toBeInTheDocument();

    // Grant 1.
    expect(await screen.findByRole('link', { name: /grant number 1/i })).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: 'Active' })).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: /ehs, hs/i })).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: /09\/28\/2021/i })).toBeInTheDocument();

    // Grant 2.
    expect(await screen.findByRole('link', { name: /grant number 2/i })).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: 'Inactive' })).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: /ehs-ccp/i })).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: /10\/01\/2021/i })).toBeInTheDocument();
  });
});
