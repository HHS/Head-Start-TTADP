import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import GrantsList from '../GrantsList';
import { GrantDataProvider } from '../../pages/GrantDataContext';

const renderGrantsList = (summary) => {
  render(<GrantDataProvider><GrantsList summary={summary} skipLoading /></GrantDataProvider>);
};

describe('Grants List Widget', () => {
  it('renders correctly without data', async () => {
    const summaryData = [];
    renderGrantsList({ summaryData });
    expect(await screen.findByRole('heading', { name: /grants/i })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: /status/i })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: /programs/i })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: /project start date/i })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: /project end date/i })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: /program specialist/i })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: /grant specialist/i })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: /annual funding month/i })).toBeInTheDocument();
  });
  it('renders correctly with data', async () => {
    const summary = {
      name: 'Test Recipient',
      grants: [
        {
          name: 'Grant Name 1',
          number: 'Grant Number 1',
          status: 'Active',
          programs: [
            {
              programType: 'EHS',
            },
            {
              programType: 'HS',
            },
          ],
          id: 1,
          programSpecialistName: 'Tim',
          grantSpecialistName: 'Sam',
          annualFundingMonth: 'January',
        },
        {
          name: 'Grant Name 2',
          number: 'Grant Number 2',
          status: 'Inactive',
          programs: [
            {
              programType: 'EHS-CCP',
            },
          ],
          startDate: '2020-10-02',
          endDate: '2021-10-01',
          programSpecialistName: 'Jim',
          grantSpecialistName: 'Joe',
          annualFundingMonth: null,
        },
      ],
    };
    renderGrantsList(summary);
    expect(await screen.findByRole('heading', { name: /grants/i })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: /status/i })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: /programs/i })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: /project end date/i })).toBeInTheDocument();

    // Grant 1.
    expect(await screen.findByText(/grant number 1/i)).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: 'Active' })).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: /ehs, hs/i })).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: /tim/i })).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: /sam/i })).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: /january/i })).toBeInTheDocument();

    // Grant 2.
    expect(await screen.findByText(/grant number 2/i)).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: 'Inactive' })).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: /ehs-ccp/i })).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: /10\/02\/2020/i })).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: /10\/01\/2021/i })).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: /jim/i })).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: /joe/i })).toBeInTheDocument();
  });
});
