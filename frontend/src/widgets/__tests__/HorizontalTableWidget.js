import '@testing-library/jest-dom';
import React from 'react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import HorizontalTableWidget from '../HorizontalTableWidget';

const renderHorizontalTableWidget = (
  headers = [],
  data = [],
  firstHeading = 'First Heading',
  enableSorting = false,
  lastHeading = 'Last Heading',
  sortConfig = {},
  requestSort = () => {},
) => {
  const history = createMemoryHistory();
  return render(
    <Router history={history}>
      <HorizontalTableWidget
        headers={headers}
        data={data}
        firstHeading={firstHeading}
        enableSorting={enableSorting}
        lastHeading={lastHeading}
        sortConfig={sortConfig}
        requestSort={requestSort}
      />
    </Router>,
  );
};

describe('Horizontal Table Widget', () => {
  it('renders correctly with data', async () => {
    const headers = ['col1', 'col2', 'col3'];
    const data = [
      {
        heading: 'Row 1 Data',
        isUrl: false,
        data: [
          {
            title: 'col1',
            value: '17',
          },
          {
            title: 'col2',
            value: '18',
          },
          {
            title: 'col3',
            value: '19',
          },
        ],
      },
    ];

    renderHorizontalTableWidget(headers, data);
    expect(screen.getByText(/First Heading/i)).toBeInTheDocument();
    expect(screen.getByText(/col1/i)).toBeInTheDocument();
    expect(screen.getByText(/col2/i)).toBeInTheDocument();
    expect(screen.getByText(/col3/i)).toBeInTheDocument();
    expect(screen.getByText(/Row 1 Data/i)).toBeInTheDocument();
    expect(screen.getByText(/17/i)).toBeInTheDocument();
    expect(screen.getByText(/18/i)).toBeInTheDocument();
    expect(screen.getByText(/19/i)).toBeInTheDocument();
    expect(screen.getByText(/Last Heading/i)).toBeInTheDocument();
  });

  it('renders correctly without data', async () => {
    renderHorizontalTableWidget();
    expect(screen.getByText(/First Heading/i)).toBeInTheDocument();
    expect(screen.getByText(/Last Heading/i)).toBeInTheDocument();
  });

  it('correctly creates a url with an internal redirect', async () => {
    const headers = ['col1', 'col2', 'col3'];
    const data = [
      {
        heading: 'Row 1 Data',
        internalRedirect: 'course-dashboard',
        isUrl: true,
        data: [
          {
            title: 'col1',
            value: '17',
          },
          {
            title: 'col2',
            value: '18',
          },
          {
            title: 'col3',
            value: '19',
          },
        ],
      },
    ];

    renderHorizontalTableWidget(headers, data);

    const url = screen.getByText(/Row 1 Data/i);
    expect(url).toHaveAttribute('href', '/course-dashboard');
  });

  it('correctly creates a url without an internal redirect', async () => {
    const headers = ['col1', 'col2', 'col3'];
    const data = [
      {
        heading: 'Row 1 Data',
        link: 'Row 1 Data',
        isUrl: true,
        data: [
          {
            title: 'col1',
            value: '17',
          },
          {
            title: 'col2',
            value: '18',
          },
          {
            title: 'col3',
            value: '19',
          },
        ],
      },
    ];

    const { container } = renderHorizontalTableWidget(headers, data);

    const url = screen.getByText(/Row 1 Data/i);
    expect(url).toHaveAttribute('href', 'Row 1 Data');

    expect(container.querySelector('.fa-arrow-up-right-from-square')).toBeInTheDocument();
  });

  it('renders with sorting', async () => {
    const headers = ['col1'];
    const data = [
      {
        heading: 'Row 1 Data',
        isUrl: false,
        data: [
          {
            title: 'col1',
            value: '17',
          },
        ],
      },
    ];
    renderHorizontalTableWidget(headers, data, 'First Heading', true);
    expect(screen.getByText(/First Heading/i)).toBeInTheDocument();
    expect(screen.getByText(/Last Heading/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /col1\. activate to sort ascending/i })).toBeInTheDocument();
  });

  it('calls sort request', async () => {
    const requestSort = jest.fn();
    const headers = ['col1'];
    const data = [
      {
        heading: 'Row 1 Data',
        isUrl: false,
        data: [
          {
            title: 'col1',
            value: '17',
          },
        ],
      },
    ];
    renderHorizontalTableWidget(headers, data, 'First Heading', true, 'Last Heading', {}, requestSort);
    expect(screen.getByText(/First Heading/i)).toBeInTheDocument();
    expect(screen.getByText(/Last Heading/i)).toBeInTheDocument();
    const sortBtn = screen.getByRole('button', { name: /col1\. activate to sort ascending/i });
    userEvent.click(sortBtn);
    await waitFor(() => expect(requestSort).toHaveBeenCalled());
  });

  it('specifies sort col and direction asc', async () => {
    const requestSort = jest.fn();
    const headers = ['col1'];
    const data = [
      {
        heading: 'Row 1 Data',
        isUrl: false,
        data: [
          {
            title: 'col1',
            value: '17',
          },
        ],
      },
    ];

    const sortConfig = {
      sortBy: 'col1',
      direction: 'asc',
      activePage: 1,
      offset: 0,
    };

    renderHorizontalTableWidget(
      headers,
      data,
      'First Heading',
      true,
      'Last Heading',
      sortConfig,
      requestSort,
    );
    expect(screen.getByText(/First Heading/i)).toBeInTheDocument();
    expect(screen.getByText(/Last Heading/i)).toBeInTheDocument();

    const sortElement = screen.getByLabelText('col1. Activate to sort descending');
    expect(sortElement).toHaveClass('sortable asc');
  });

  it('specifies sort col and direction desc', async () => {
    const requestSort = jest.fn();
    const headers = ['col1'];
    const data = [
      {
        heading: 'Row 1 Data',
        isUrl: false,
        data: [
          {
            title: 'col1',
            value: '17',
          },
        ],
      },
    ];

    const sortConfig = {
      sortBy: 'col1',
      direction: 'desc',
      activePage: 1,
      offset: 0,
    };

    renderHorizontalTableWidget(
      headers,
      data,
      'First Heading',
      true,
      'Last Heading',
      sortConfig,
      requestSort,
    );
    expect(screen.getByText(/First Heading/i)).toBeInTheDocument();
    expect(screen.getByText(/Last Heading/i)).toBeInTheDocument();

    const sortElement = screen.getByLabelText('col1. Activate to sort ascending');
    expect(sortElement).toHaveClass('sortable desc');
  });
});
