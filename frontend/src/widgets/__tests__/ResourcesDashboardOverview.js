/* eslint-disable jest/no-disabled-tests */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResourcesDashboardOverviewWidget } from '../ResourcesDashboardOverview';

const renderResourcesDashboardOverview = (props) => (
  render(<ResourcesDashboardOverviewWidget loading={props.loading} data={props.data} />)
);

describe('Resource Dashboard Overview Widget', () => {
  it('handles undefined data', async () => {
    renderResourcesDashboardOverview({ data: undefined });

    expect(screen.getByText(/^[ \t]*Recipients rec'd resources\r?\n?[ \t]*0 of 0/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Recipients rec'd ECLKC resources\r?\n?[ \t]*0 of 0/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Recipients rec'd non-ECLKC resources\r?\n?[ \t]*0 of 0/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Recipients rec'd no resources\r?\n?[ \t]*0 of 0/i)).toBeInTheDocument();

    expect(screen.getByText(/^[ \t]*Reports include resources\r?\n?[ \t]*0 of 0/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Reports include ECLKC resources\r?\n?[ \t]*0 of 0/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Reports include non-ECLKC resources\r?\n?[ \t]*0 of 0/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Reports include no resources\r?\n?[ \t]*0 of 0/i)).toBeInTheDocument();

    expect(screen.getByText(/^[ \t]*ECLKC Resources\r?\n?[ \t]*0 of 0/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Non-ECLKC Resources\r?\n?[ \t]*0 of 0/i)).toBeInTheDocument();
  });

  it('shows the correct data', async () => {
    const data = {
      report: {
        num: '1,721',
        numResources: '661',
        percentResources: '38.41%',
        numNoResources: '1,060',
        percentNoResources: '61.59%',
        numEclkc: '634',
        percentEclkc: '36.84%',
        numNonEclkc: '101',
        percentNonEclkc: '5.87%',
      },
      recipient: {
        num: '231',
        numResources: '220',
        percentResources: '95.24%',
        numNoResources: '11',
        percentNoResources: '4.76%',
        numEclkc: '219',
        percentEclkc: '94.81%',
        numNonEclkc: '83',
        percentNonEclkc: '35.93%',
      },
      resource: {
        num: '606',
        numEclkc: '500',
        percentEclkc: '82.51%',
        numNonEclkc: '106',
        percentNonEclkc: '17.49%',
      },
    };

    renderResourcesDashboardOverview({ data });

    expect(screen.getByText(/^[ \t]*Recipients rec'd resources\r?\n?[ \t]*220 of 231/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Recipients rec'd ECLKC resources\r?\n?[ \t]*219 of 231/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Recipients rec'd non-ECLKC resources\r?\n?[ \t]*83 of 231/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Recipients rec'd no resources\r?\n?[ \t]*11 of 231/i)).toBeInTheDocument();

    expect(screen.getByText(/^[ \t]*Reports include resources\r?\n?[ \t]*661 of 1,721/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Reports include ECLKC resources\r?\n?[ \t]*634 of 1,721/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Reports include non-ECLKC resources\r?\n?[ \t]*101 of 1,721/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Reports include no resources\r?\n?[ \t]*1,060 of 1,721/i)).toBeInTheDocument();

    expect(screen.getByText(/^[ \t]*ECLKC Resources\r?\n?[ \t]*500 of 606/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Non-ECLKC Resources\r?\n?[ \t]*106 of 606/i)).toBeInTheDocument();
  });

  it('shows the correct data when single value is passed', async () => {
    const data = {
      report: {
        num: '1,721',
        numResources: '1',
        percentResources: '38.41%',
        numNoResources: '1',
        percentNoResources: '61.59%',
        numEclkc: '1',
        percentEclkc: '36.84%',
        numNonEclkc: '1',
        percentNonEclkc: '5.87%',
      },
      recipient: {
        num: '231',
        numResources: '1',
        percentResources: '95.24%',
        numNoResources: '1',
        percentNoResources: '4.76%',
        numEclkc: '1',
        percentEclkc: '94.81%',
        numNonEclkc: '1',
        percentNonEclkc: '35.93%',
      },
      resource: {
        num: '606',
        numEclkc: '1',
        percentEclkc: '82.51%',
        numNonEclkc: '1',
        percentNonEclkc: '17.49%',
      },
    };

    renderResourcesDashboardOverview({ data });

    expect(screen.getByText(/^[ \t]*Recipient rec'd resources\r?\n?[ \t]*220 of 231/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Recipient rec'd ECLKC resources\r?\n?[ \t]*219 of 231/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Recipient rec'd non-ECLKC resources\r?\n?[ \t]*83 of 231/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Recipient rec'd no resources\r?\n?[ \t]*11 of 231/i)).toBeInTheDocument();

    expect(screen.getByText(/^[ \t]*Report include resources\r?\n?[ \t]*661 of 1,721/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Report include ECLKC resources\r?\n?[ \t]*634 of 1,721/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Report include non-ECLKC resources\r?\n?[ \t]*101 of 1,721/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Report include no resources\r?\n?[ \t]*1,060 of 1,721/i)).toBeInTheDocument();

    expect(screen.getByText(/^[ \t]*ECLKC Resource\r?\n?[ \t]*500 of 606/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Non-ECLKC Resource\r?\n?[ \t]*106 of 606/i)).toBeInTheDocument();
  });

  it('renders loading when loading', async () => {
    renderResourcesDashboardOverview({ loading: true });

    expect(await screen.findByText('Loading')).toBeInTheDocument();
  });
});
