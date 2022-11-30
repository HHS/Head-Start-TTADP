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
    const resourcesLabels = screen.queryAllByRole('columnheader', { name: /resource/i });
    expect(resourcesLabels.length).toBe(2);
    expect(screen.getByRole('columnheader', { name: /number of resources/i })).toBeInTheDocument();
  });

  it('renders correctly with data', async () => {
    const data = [
      { name: 'Resource one', count: 4 },
      { name: 'Resource two', count: 2 },
    ];
    renderResourceList(data);

    expect(screen.getByText(/resources in activity reports/i)).toBeInTheDocument();
    const resourcesLabels = screen.queryAllByRole('columnheader', { name: /resource/i });
    expect(resourcesLabels.length).toBe(2);
    expect(screen.getByRole('columnheader', { name: /number of resources/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /resource one/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /4/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /resource two/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /2/i })).toBeInTheDocument();
  });

  it('renders large resource and count', async () => {
    const data = [
      { name: 'resource one', count: 10 },
      { name: 'resource two', count: 9 },
      { name: 'resource three', count: 8 },
      { name: 'resource four', count: 7 },
      { name: 'resource five', count: 6 },
      { name: 'resource six', count: 5 },
      { name: 'resource seven', count: 4 },
      { name: 'resource 8', count: 3 },
      { name: 'resource 9', count: 2 },
      { name: 'resource 10 is a very very very long resource and should not cut off the text', count: '999,999' },
    ];
    renderResourceList(data);

    expect(screen.getByText(/resources in activity reports/i)).toBeInTheDocument();
    const resourcesLabels = screen.queryAllByRole('columnheader', { name: /resource/i });
    expect(resourcesLabels.length).toBe(2);
    expect(screen.getByRole('columnheader', { name: /number of resources/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /resource 10 is a very very very long resource and should not cut off the text/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /999,999/i })).toBeInTheDocument();
  });
});
