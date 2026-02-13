import '@testing-library/jest-dom'
import { Router } from 'react-router'
import React from 'react'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryHistory } from 'history'
import HorizontalTableWidget from '../HorizontalTableWidget'

const history = createMemoryHistory()

const renderHorizontalTableWidget = (
  headers = [],
  data = [],
  firstHeading = 'First Heading',
  enableSorting = false,
  lastHeading = 'Last Heading',
  sortConfig = {},
  requestSort = () => {},
  enableCheckboxes = false,
  showTotalColumn = true,
  showDashForNullValue = false
) =>
  render(
    <Router history={history}>
      <HorizontalTableWidget
        headers={headers}
        data={data}
        firstHeading={firstHeading}
        enableSorting={enableSorting}
        lastHeading={lastHeading}
        sortConfig={sortConfig}
        requestSort={requestSort}
        enableCheckboxes={enableCheckboxes}
        showTotalColumn={showTotalColumn}
        showDashForNullValue={showDashForNullValue}
      />
    </Router>
  )

describe('Horizontal Table Widget', () => {
  it('renders correctly with data', async () => {
    const headers = ['col1', 'col2', 'col3']
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
    ]

    renderHorizontalTableWidget(headers, data)
    expect(screen.getByText(/First Heading/i)).toBeInTheDocument()
    expect(screen.getByText(/col1/i, { selector: '.usa-sr-only' })).toBeInTheDocument()
    expect(screen.getByText(/col2/i, { selector: '.usa-sr-only' })).toBeInTheDocument()
    expect(screen.getByText(/col3/i, { selector: '.usa-sr-only' })).toBeInTheDocument()
    expect(screen.getAllByText(/Row 1 Data/i)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/17/i)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/18/i)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/19/i)[0]).toBeInTheDocument()
    expect(screen.getByText(/Last Heading/i)).toBeInTheDocument()
  })

  it('renders correctly without data', async () => {
    renderHorizontalTableWidget()
    expect(screen.getByText(/First Heading/i)).toBeInTheDocument()
    expect(screen.getByText(/Last Heading/i)).toBeInTheDocument()
  })

  it('correctly renders url icon', async () => {
    const headers = ['col1', 'col2', 'col3']
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
    ]

    const { container } = renderHorizontalTableWidget(headers, data)

    const url = screen.getByText(/Row 1 Data/i)
    expect(url).toHaveAttribute('href', 'Row 1 Data')

    expect(container.querySelector('.fa-arrow-up-right-from-square')).toBeInTheDocument()
  })

  it('correctly renders link when isInternalLink is true', async () => {
    const headers = ['col1', 'col2', 'col3']
    const data = [
      {
        heading: 'Row 1 Data',
        link: 'internal link 1',
        isUrl: true,
        isInternalLink: true,
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
    ]

    renderHorizontalTableWidget(headers, data)
    // find element a with href of href="/internal link 1".
    const url = screen.getByText(/Row 1 Data/i)
    expect(url).toHaveAttribute('href', '/internal link 1')
  })

  it('renders with sorting', async () => {
    const headers = ['col1']
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
    ]
    renderHorizontalTableWidget(headers, data, 'First Heading', true)
    expect(screen.getByText(/First Heading/i)).toBeInTheDocument()
    expect(screen.getByText(/Last Heading/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /col1\. activate to sort ascending/i })).toBeInTheDocument()
  })

  it('calls sort request', async () => {
    const requestSort = jest.fn()
    const headers = ['col1']
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
    ]
    renderHorizontalTableWidget(headers, data, 'First Heading', true, 'Last Heading', {}, requestSort)
    expect(screen.getByText(/First Heading/i)).toBeInTheDocument()
    expect(screen.getByText(/Last Heading/i)).toBeInTheDocument()
    const sortBtn = screen.getByRole('button', { name: /col1\. activate to sort ascending/i })
    userEvent.click(sortBtn)
    await waitFor(() => expect(requestSort).toHaveBeenCalled())
  })

  it('specifies sort col and direction asc', async () => {
    const requestSort = jest.fn()
    const headers = ['col1']
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
    ]

    const sortConfig = {
      sortBy: 'col1',
      direction: 'asc',
      activePage: 1,
      offset: 0,
    }

    renderHorizontalTableWidget(headers, data, 'First Heading', true, 'Last Heading', sortConfig, requestSort)
    expect(screen.getByText(/First Heading/i)).toBeInTheDocument()
    expect(screen.getByText(/Last Heading/i)).toBeInTheDocument()

    const sortElement = screen.getByLabelText('col1. Activate to sort descending')
    expect(sortElement).toHaveClass('sortable asc')
  })

  it('properly displays a internal link in the table', async () => {
    const headers = ['col1']
    const data = [
      {
        heading: 'Row 1 Data',
        isUrl: false,
        data: [
          {
            title: 'col1',
            value: 'Test Link',
            isUrl: true,
            link: 'example.com',
            isInternalLink: true,
            hideLinkIcon: true,
          },
        ],
      },
    ]

    renderHorizontalTableWidget(headers, data, 'First Heading', false, 'Last Heading', {}, {}, false, false)
    expect(screen.getByText(/First Heading/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Row 1 Data/i)[0]).toBeInTheDocument()
    const url = screen.getByText(/Test Link/i)
    expect(url).toHaveAttribute('href', '/example.com')
  })

  it('properly displays a external link in the table', async () => {
    const headers = ['col1']
    const data = [
      {
        heading: 'Row 1 Data',
        isUrl: false,
        data: [
          {
            title: 'col1',
            value: 'Test Link',
            isUrl: true,
            link: 'http://external.example.com',
            isInternalLink: false,
            hideLinkIcon: true,
          },
        ],
      },
    ]

    renderHorizontalTableWidget(headers, data, 'First Heading', false, 'Last Heading', {}, {}, false, false)
    expect(screen.getByText(/First Heading/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Row 1 Data/i)[0]).toBeInTheDocument()
    const url = screen.getByText(/Test Link/i)
    expect(url).toHaveAttribute('href', 'http://external.example.com')
  })

  it('specifies sort col and direction desc', async () => {
    const requestSort = jest.fn()
    const headers = ['col1']
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
    ]

    const sortConfig = {
      sortBy: 'col1',
      direction: 'desc',
      activePage: 1,
      offset: 0,
    }

    renderHorizontalTableWidget(headers, data, 'First Heading', true, 'Last Heading', sortConfig, requestSort)
    expect(screen.getByText(/First Heading/i)).toBeInTheDocument()
    expect(screen.getByText(/Last Heading/i)).toBeInTheDocument()

    const sortElement = screen.getByLabelText('col1. Activate to sort ascending')
    expect(sortElement).toHaveClass('sortable desc')
  })

  it('shows checkboxes when enabled', async () => {
    const headers = ['col1']
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
    ]
    renderHorizontalTableWidget(headers, data, 'First Heading', false, 'Last Heading', {}, {}, true)
    expect(screen.getByText(/First Heading/i)).toBeInTheDocument()
    expect(screen.getByText(/Last Heading/i)).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(2)
  })

  it('hides the total column when the hideTotal param is passed', async () => {
    const headers = ['col1', 'col2', 'col3']
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
    ]

    renderHorizontalTableWidget(headers, data, 'First Heading', false, 'Last Heading', {}, {}, false, false)
    expect(screen.getByText(/First Heading/i)).toBeInTheDocument()
    expect(screen.getByText(/col1/i, { selector: '.usa-sr-only' })).toBeInTheDocument()
    expect(screen.getByText(/col2/i, { selector: '.usa-sr-only' })).toBeInTheDocument()
    expect(screen.getByText(/col3/i, { selector: '.usa-sr-only' })).toBeInTheDocument()
    expect(screen.getAllByText(/Row 1 Data/i)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/17/i)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/18/i)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/19/i)[0]).toBeInTheDocument()
    expect(screen.queryAllByText(/Last Heading/i).length).toBe(0)
  })

  it('hides the link icon when the hideLinkIcon param is passed', async () => {
    const headers = ['col1', 'col2', 'col3']
    const data = [
      {
        heading: 'Row 1 Data',
        link: 'Row 1 Data',
        isUrl: true,
        hideLinkIcon: true,
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
    ]

    const { container } = renderHorizontalTableWidget(headers, data, 'First Heading', false, 'Last Heading', {}, {}, false, true)
    expect(container.querySelector('.fa-arrow-up-right-from-square')).toBeNull()
  })
})
