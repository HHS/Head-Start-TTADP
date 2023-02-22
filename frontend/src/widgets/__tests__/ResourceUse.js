import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import ResourceUse from '../ResourceUse';

const headersData = ['Jan-22', 'Feb-22', 'Mar-22'];
const testData = [
  {
    heading: 'https://eclkc.ohs.acf.hhs.gov/school-readiness/effective-practice-guides/effective-practice-guides',
    isUrl: 'true',
    data: [
      {
        title: 'Jan-22',
        value: '17',
      },
      {
        title: 'Feb-22',
        value: '18',
      },
      {
        title: 'Mar-22',
        value: '19',
      },
      {
        title: 'total',
        value: '20',
      },
    ],
  },
  {
    heading: 'https://test1.gov',
    isUrl: 'true',
    data: [
      {
        title: 'Jan-22',
        value: '21',
      },
      {
        title: 'Feb-22',
        value: '22',
      },
      {
        title: 'Mar-22',
        value: '23',
      },
      {
        title: 'total',
        value: '24',
      },
    ],
  },
  {
    heading: 'Non URL',
    isUrl: 'false',
    data: [
      {
        title: 'Jan-22',
        value: '25',
      },
      {
        title: 'Feb-22',
        value: '26',
      },
      {
        title: 'Mar-22',
        value: '27',
      },
      {
        title: 'total',
        value: '28',
      },
    ],

  },
];

const renderResourceUse = (data) => {
  render(<ResourceUse
    headers={headersData}
    data={data}
  />);
};

describe('Resource Use Widget', () => {
  it('renders correctly without data', async () => {
    const data = [];
    renderResourceUse(data);

    expect(screen.getByText(/Resource use/i)).toBeInTheDocument();
    expect(screen.getByText(/Showing the 10 resources cited most often on Activity Reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Resource URL:/i)).toBeInTheDocument();
    expect(screen.getByText(/Jan-22/i)).toBeInTheDocument();
    expect(screen.getByText(/Mar-22/i)).toBeInTheDocument();
    expect(screen.getByText(/Feb-22/i)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /total/i })).toBeInTheDocument();
  });

  it('renders correctly with data', async () => {
    renderResourceUse(testData);

    expect(screen.getByText(/Resource use/i)).toBeInTheDocument();
    expect(screen.getByText(/Showing the 10 resources cited most often on Activity Reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Resource URL:/i)).toBeInTheDocument();
    expect(screen.getByText(/Jan-22/i)).toBeInTheDocument();
    expect(screen.getByText(/Mar-22/i)).toBeInTheDocument();
    expect(screen.getByText(/Feb-22/i)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /total/i })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /https:\/\/eclkc\.ohs\.acf\.hhs\.gov\/school-readiness\/effective-practice-guides\/effective-practice-guides/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /17/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /18/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /19/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /20/i })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /https:\/\/test1\.gov/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /21/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /22/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /23/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /24/i })).toBeInTheDocument();

    expect(screen.getByRole('cell', { name: /non url/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /25/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /26/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /27/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /28/i })).toBeInTheDocument();
  });
});
