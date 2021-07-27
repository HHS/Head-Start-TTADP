import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import ReasonList from '../ReasonList';

const renderReasonList = (props) => {
  render(<ReasonList data={props.data} allRegions={[]} dateRange={props.dateRange} skipLoading />);
};

describe('Reason List Widget', () => {
  it('renders correctly without data', async () => {
    const data = [];
    const dateRange = '2021/07/01-2021/04/01';
    renderReasonList({ data, dateRange });

    expect(screen.getByText(/reasons in activity reports/i)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /reason/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /# of activities/i })).toBeInTheDocument();
  });

  it('renders correctly with data', async () => {
    const data = [
      { name: 'reason one', count: 4 },
      { name: 'reason two', count: 2 },
    ];
    renderReasonList({ data });

    expect(screen.getByText(/reasons in activity reports/i)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /reason/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /# of activities/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /reason one/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /4/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /reason two/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /2/i })).toBeInTheDocument();
  });

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
    expect(screen.getByRole('cell', { name: /999999/i })).toBeInTheDocument();
  });
});
