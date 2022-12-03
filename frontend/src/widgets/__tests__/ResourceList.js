import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import ResourceList from '../ResourceList';

const renderResourceList = (data) => {
  render(<ResourceList
    data={data}
    loading={false}
  />);
};

describe('Resource List Widget', () => {
  it('renders correctly without data', async () => {
    const data = [];
    renderResourceList(data);

    expect(screen.getByText(/resources in activity reports/i)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /resource/i })).toBeInTheDocument(3);
    expect(screen.getByRole('columnheader', { name: /number of activities/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /number of recipients/i })).toBeInTheDocument();
  });

  it('renders correctly with data', async () => {
    const data = [
      { name: 'Resource one', reportCount: 4, recipientCount: 2 },
      { name: 'Resource two', reportCount: 2, recipientCount: 2 },
    ];
    renderResourceList(data);

    expect(screen.getByText(/resources in activity reports/i)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /resource/i })).toBeInTheDocument(3);
    expect(screen.getByRole('columnheader', { name: /number of activities/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /number of recipients/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /resource one/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /4/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /2/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /resource two/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /2/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /2/i })).toBeInTheDocument();
  });

  it('renders large resource and count', async () => {
    const data = [
      { name: 'resource one', reportCount: 10, recipientCount: 1 },
      { name: 'resource two', reportCount: 9, recipientCount: 2 },
      { name: 'resource three', reportCount: 8, recipientCount: 3 },
      { name: 'resource four', reportCount: 7, recipientCount: 4 },
      { name: 'resource five', reportCount: 6, recipientCount: 5 },
      { name: 'resource six', reportCount: 5, recipientCount: 6 },
      { name: 'resource seven', reportCount: 4, recipientCount: 7 },
      { name: 'resource 8', reportCount: 3, recipientCount: 8 },
      { name: 'resource 9', reportCount: 2, recipientCount: 9 },
      { name: 'resource 10 is a very very very long resource and should not cut off the text', reportCount: '999,999', recipientCount: '888,888' },
    ];
    renderResourceList(data);

    expect(screen.getByText(/resources in activity reports/i)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /resource/i })).toBeInTheDocument(3);
    expect(screen.getByRole('columnheader', { name: /number of activities/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /resource 10 is a very very very long resource and should not cut off the text/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /999,999/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /888,888/i })).toBeInTheDocument();
  });
});
