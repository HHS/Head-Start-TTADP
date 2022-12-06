import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import ResourceDomainList from '../ResourceDomainList';

const renderResourceDomainList = (data) => {
  render(<ResourceDomainList
    data={data}
    loading={false}
  />);
};

describe('Resource Domain List Widget', () => {
  it('renders correctly without data', async () => {
    const data = [];
    renderResourceDomainList(data);

    expect(screen.getByText(/resource domains in activity reports/i)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /domain/i })).toBeInTheDocument(3);
    expect(screen.getByRole('columnheader', { name: /number of resources/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /number of activities/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /number of recipients/i })).toBeInTheDocument();
  });

  it('renders correctly with data', async () => {
    const data = [
      {
        domain: 'Resource one',
        reportCount: 4,
        resourceCount: 6,
        recipientCount: 2,
      },
      {
        domain: 'Resource two',
        reportCount: 7,
        resourceCount: 8,
        recipientCount: 3,
      },
    ];
    renderResourceDomainList(data);

    expect(screen.getByText(/resource domains in activity reports/i)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /domain/i })).toBeInTheDocument(3);
    expect(screen.getByRole('columnheader', { name: /number of resources/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /number of activities/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /number of recipients/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /resource one/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /6/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /4/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /2/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /resource two/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /8/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /7/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /3/i })).toBeInTheDocument();
  });

  it('renders large resource and count', async () => {
    const data = [
      {
        domain: 'resource one',
        reportCount: 10,
        participantCount: 8,
        recipientCount: 1,
      },
      {
        domain: 'resource two',
        reportCount: 9,
        resourceCount: 8,
        recipientCount: 2,
      },
      {
        domain: 'resource three',
        reportCount: 8,
        resourceCount: 8,
        recipientCount: 3,
      },
      {
        domain: 'resource four',
        reportCount: 7,
        resourceCount: 8,
        recipientCount: 4,
      },
      {
        domain: 'resource five',
        reportCount: 6,
        resourceCount: 8,
        recipientCount: 5,
      },
      {
        domain: 'resource six',
        reportCount: 5,
        resourceCount: 8,
        recipientCount: 6,
      },
      {
        domain: 'resource seven',
        reportCount: 4,
        resourceCount: 8,
        recipientCount: 7,
      },
      {
        domain: 'resource 8',
        reportCount: 3,
        resourceCount: 8,
        recipientCount: 8,
      },
      {
        domain: 'resource 9',
        reportCount: 2,
        resourceCount: 8,
        recipientCount: 9,
      },
      {
        domain: 'resource 10 is a very very very long resource and should not cut off the text',
        reportCount: '999,999',
        resourceCount: '777,777',
        recipientCount: '888,888',
      },
    ];
    renderResourceDomainList(data);

    expect(screen.getByText(/resources in activity reports/i)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /domain/i })).toBeInTheDocument(3);
    expect(screen.getByRole('columnheader', { name: /number of resources/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /number of activities/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /number of recipients/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /resource 10 is a very very very long resource and should not cut off the text/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /777,777/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /999,999/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /888,888/i })).toBeInTheDocument();
  });
});
