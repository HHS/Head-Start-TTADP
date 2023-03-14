import '@testing-library/jest-dom';
import React from 'react';
import fetchMock from 'fetch-mock';
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from '@testing-library/react';
import ResourcesAssociatedWithTopics from '../ResourcesAssociatedWithTopics';

const emptyData = {
  count: 0,
  data:
    {
      headers: ['Jan-22', 'Feb-22', 'Mar-22'],
      rows: [],
    },
};

const mockData = {
  count: 1,
  data:
    {
      headers: ['Jan-22', 'Feb-22', 'Mar-22'],
      rows: [{
        heading: 'https://official.gov',
        isUrl: true,
        data: [
          {
            title: 'Jan-22',
            value: '66',
          },
          {
            title: 'Feb-22',
            value: '77',
          },
          {
            title: 'Mar-22',
            value: '88',
          },
          {
            title: 'total',
            value: '99',
          },
        ],
      },
      ],
    },
};

const resetMockData = {
  count: 1,
  data:
    {
      headers: ['Apr-22', 'May-22', 'Jun-22'],
      rows: [{
        heading: 'https://official2.gov',
        isUrl: true,
        data: [
          {
            title: 'Apr-22',
            value: '111',
          },
          {
            title: 'May-22',
            value: '222',
          },
          {
            title: 'Jun-22',
            value: '333',
          },
          {
            title: 'total',
            value: '444',
          },
        ],
      },
      ],
    },
};

const withRegionOne = '&region.in[]=1';
const withRegionTwo = '&region.in[]=2';
const base = '/api/resources/topic-resources?sortBy=1&sortDir=desc&offset=0&limit=10';
const baseOnePerPage = '/api/resources/topic-resources?sortBy=1&sortDir=desc&offset=0&limit=1';
const basePageTwo = '/api/resources/topic-resources?sortBy=1&sortDir=desc&offset=1&limit=1';
const defaultBaseUrlWithRegionOne = `${base}${withRegionOne}`;
const defaultBaseUrlWithRegionTwo = `${base}${withRegionTwo}`;
const defaultBaseOnePerUrlWithRegionOne = `${baseOnePerPage}${withRegionOne}`;
const defaultBasePageTwoWithRegionOne = `${basePageTwo}${withRegionOne}`;

// eslint-disable-next-line react/prop-types
const TableMock = ({ filters, perPage }) => {
  const [resetPagination, setResetPagination] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setResetPagination(!resetPagination)}
        data-testid="reset-pagination"
      >
        Reset pagination
      </button>
      <ResourcesAssociatedWithTopics
        filters={filters}
        resetPagination={resetPagination}
        setResetPagination={setResetPagination}
        perPageNumber={perPage}
      />
    </>
  );
};

const renderResourcesAssociatedWithTopics = (filters, perPage = 10) => {
  render(<TableMock filters={filters} perPage={perPage} />);
};

describe('Resources Associated with Topics', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it('renders correctly without data', async () => {
    fetchMock.get(defaultBaseUrlWithRegionOne, emptyData);
    renderResourcesAssociatedWithTopics([{
      id: '1',
      topic: 'region',
      condition: 'is',
      query: '1',
    }]);

    expect(screen.getByText(/Resources associated with topics on Activity Reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Topics/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Jan-22/i)).toBeInTheDocument();
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument();
      expect(screen.getByText(/Mar-22/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('columnheader', { name: /total/i })).toBeInTheDocument();
  });

  it('renders error correctly', async () => {
    fetchMock.restore();
    fetchMock.get(defaultBaseUrlWithRegionOne, 500);
    renderResourcesAssociatedWithTopics([{
      id: '1',
      topic: 'region',
      condition: 'is',
      query: '1',
    }]);
    expect(await screen.findByText(/Unable to fetch resources associated with topics/i)).toBeVisible();
  });

  it('renders correctly with data', async () => {
    fetchMock.get(defaultBaseUrlWithRegionTwo, mockData);
    renderResourcesAssociatedWithTopics([{
      id: '1',
      topic: 'region',
      condition: 'is',
      query: '2',
    }]);

    expect(screen.getByText(/Resources associated with topics on Activity Reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Topics/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Jan-22/i)).toBeInTheDocument();
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument();
      expect(screen.getByText(/Mar-22/i)).toBeInTheDocument();

      expect(screen.getByRole('link', { name: /https:\/\/official\.gov/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /66/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /77/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /88/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /99/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('columnheader', { name: /total/i })).toBeInTheDocument();
  });

  it('correctly request sort', async () => {
    fetchMock.get(defaultBaseUrlWithRegionOne, mockData);
    renderResourcesAssociatedWithTopics([{
      id: '1',
      topic: 'region',
      condition: 'is',
      query: '1',
    }]);
    expect(screen.getByText(/Resources associated with topics on Activity Reports/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Jan-22/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /https:\/\/official\.gov/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /66/i })).toBeInTheDocument();
    });

    const sortReq = 'api/resources/topic-resources?sortBy=Feb-22&sortDir=asc&offset=0&limit=10&region.in[]=1';
    fetchMock.get(sortReq, resetMockData);

    const sortColBtn = await screen.findByRole('button', { name: /feb-22\. activate to sort ascending/i });
    act(() => fireEvent.click(sortColBtn));

    await waitFor(() => {
      expect(screen.getByText(/Apr-22/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /https:\/\/official2\.gov/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /111/i })).toBeInTheDocument();
    });
  });

  it('handles resetting pagination', async () => {
    fetchMock.get(defaultBaseUrlWithRegionOne, mockData);
    renderResourcesAssociatedWithTopics([{
      id: '1',
      topic: 'region',
      condition: 'is',
      query: '1',
    }]);

    expect(screen.getByText(/Resources associated with topics on Activity Reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Topics/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Jan-22/i)).toBeInTheDocument();
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument();
      expect(screen.getByText(/Mar-22/i)).toBeInTheDocument();

      expect(screen.getByRole('link', { name: /https:\/\/official\.gov/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /66/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /77/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /88/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /99/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('columnheader', { name: /total/i })).toBeInTheDocument();

    // Click reset.
    const [resetButton] = await screen.findAllByTestId('reset-pagination');
    fetchMock.reset();
    expect(fetchMock.called()).toBe(false);
    fetchMock.get(defaultBaseUrlWithRegionOne, resetMockData);
    act(() => fireEvent.click(resetButton));
    await waitFor(() => expect(fetchMock.called()).toBe(true));

    // Verify reset data.
    await waitFor(() => {
      expect(screen.getByText(/Apr-22/i)).toBeInTheDocument();
      expect(screen.getByText(/May-22/i)).toBeInTheDocument();
      expect(screen.getByText(/Jun-22/i)).toBeInTheDocument();

      expect(screen.getByRole('link', { name: /https:\/\/official2\.gov/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /111/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /222/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /333/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /444/i })).toBeInTheDocument();
    });
  });

  it('handles page change', async () => {
    fetchMock.get(defaultBaseOnePerUrlWithRegionOne, { count: 2, data: { ...mockData.data } });
    renderResourcesAssociatedWithTopics([{
      id: '1',
      topic: 'region',
      condition: 'is',
      query: '1',
    }], 1);

    expect(screen.getByText(/Resources associated with topics on Activity Reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Topics/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Jan-22/i)).toBeInTheDocument();
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument();
      expect(screen.getByText(/Mar-22/i)).toBeInTheDocument();

      expect(screen.getByRole('link', { name: /https:\/\/official\.gov/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /66/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /77/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /88/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /99/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('columnheader', { name: /total/i })).toBeInTheDocument();

    // Click page change.
    const nextPageBtn = await screen.findByRole('button', { name: /page 2/i });
    fetchMock.reset();
    expect(fetchMock.called()).toBe(false);
    fetchMock.get(defaultBasePageTwoWithRegionOne, { count: 2, data: { ...resetMockData.data } });
    act(() => fireEvent.click(nextPageBtn));
    await waitFor(() => expect(fetchMock.called()).toBe(true));

    // Verify reset data.
    await waitFor(() => {
      expect(screen.getByText(/Apr-22/i)).toBeInTheDocument();
      expect(screen.getByText(/May-22/i)).toBeInTheDocument();
      expect(screen.getByText(/Jun-22/i)).toBeInTheDocument();

      expect(screen.getByRole('link', { name: /https:\/\/official2\.gov/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /111/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /222/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /333/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /444/i })).toBeInTheDocument();
    });

    // Click < Prev page.
    const prevPageBtn = await screen.findByRole('button', { name: /previous page/i });
    fetchMock.reset();
    expect(fetchMock.called()).toBe(false);
    fetchMock.get(defaultBaseOnePerUrlWithRegionOne, { count: 2, data: { ...mockData.data } });
    act(() => fireEvent.click(prevPageBtn));
    await waitFor(() => expect(fetchMock.called()).toBe(true));

    expect(screen.getByText(/Resources associated with topics on Activity Reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Topics/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Jan-22/i)).toBeInTheDocument();
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument();
      expect(screen.getByText(/Mar-22/i)).toBeInTheDocument();

      expect(screen.getByRole('link', { name: /https:\/\/official\.gov/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /66/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /77/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /88/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /99/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('columnheader', { name: /total/i })).toBeInTheDocument();
  });
});
