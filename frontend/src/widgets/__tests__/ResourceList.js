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
    expect(screen.getByRole('columnheader', { name: /number of participants/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /number of recipients/i })).toBeInTheDocument();
  });

  it('renders correctly with data', async () => {
    const data = [
      {
        name: 'Resource one',
        url: '',
        reportCount: 4,
        participantCount: 6,
        recipientCount: 2,
      },
      {
        name: 'Resource two',
        url: '',
        reportCount: 7,
        participantCount: 8,
        recipientCount: 3,
      },
    ];
    renderResourceList(data);

    expect(screen.getByText(/resources in activity reports/i)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /resource/i })).toBeInTheDocument(3);
    expect(screen.getByRole('columnheader', { name: /number of activities/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /number of participants/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /number of recipients/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /resource one/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /4/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /6/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /2/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /resource two/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /2/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /8/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /2/i })).toBeInTheDocument();
  });

  it('renders large resource and count', async () => {
    const data = [
      {
        name: 'resource one',
        url: '',
        reportCount: 10,
        participantCount: 8,
        recipientCount: 1,
      },
      {
        name: 'resource two',
        url: '',
        reportCount: 9,
        participantCount: 8,
        recipientCount: 2,
      },
      {
        name: 'resource three',
        url: '',
        reportCount: 8,
        participantCount: 8,
        recipientCount: 3,
      },
      {
        name: 'resource four',
        url: '',
        reportCount: 7,
        participantCount: 8,
        recipientCount: 4,
      },
      {
        name: 'resource five',
        url: '',
        reportCount: 6,
        participantCount: 8,
        recipientCount: 5,
      },
      {
        name: 'resource six',
        url: '',
        reportCount: 5,
        participantCount: 8,
        recipientCount: 6,
      },
      {
        name: 'resource seven',
        url: '',
        reportCount: 4,
        participantCount: 8,
        recipientCount: 7,
      },
      {
        name: 'resource 8',
        url: '',
        reportCount: 3,
        participantCount: 8,
        recipientCount: 8,
      },
      {
        name: 'resource 9',
        url: '',
        reportCount: 2,
        participantCount: 8,
        recipientCount: 9,
      },
      {
        name: 'resource 10 is a very very very long resource and should not cut off the text',
        url: '',
        reportCount: '999,999',
        participantCount: '777,777',
        recipientCount: '888,888',
      },
    ];
    renderResourceList(data);

    expect(screen.getByText(/resources in activity reports/i)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /resource/i })).toBeInTheDocument(3);
    expect(screen.getByRole('columnheader', { name: /number of activities/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /number of participants/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /number of recipients/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /resource 10 is a very very very long resource and should not cut off the text/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /999,999/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /777,777/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /888,888/i })).toBeInTheDocument();
  });
});
