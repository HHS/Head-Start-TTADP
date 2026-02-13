import '@testing-library/jest-dom'
import React from 'react'
import fetchMock from 'fetch-mock'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import ResourcesAssociatedWithTopics, { parseValue } from '../ResourcesAssociatedWithTopics'

const emptyData = {
  headers: ['Jan-22', 'Feb-22', 'Mar-22'],
  topics: [],
}

const mockData = {
  headers: ['Jan-22', 'Feb-22', 'Mar-22'],
  topics: [
    {
      link: 'https://official.gov',
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
}

const mockSortData = {
  headers: ['Feb-22'],
  topics: [
    {
      link: 'https://secondrow.gov',
      heading: 'https://secondrow.gov',
      isUrl: true,
      data: [
        {
          title: 'Feb-22',
          value: '2',
        },
        {
          title: 'total',
          value: '4',
        },
      ],
    },
    {
      link: 'https://firstrow.gov',
      heading: 'https://firstrow.gov',
      isUrl: true,
      data: [
        {
          title: 'Feb-22',
          value: '1',
        },
        {
          title: 'total',
          value: '3',
        },
      ],
    },
  ],
}

// eslint-disable-next-line react/prop-types
const TableMock = ({ data, perPage }) => {
  const [resetPagination, setResetPagination] = React.useState(false)
  return (
    <>
      <button type="button" onClick={() => setResetPagination(!resetPagination)} data-testid="reset-pagination">
        Reset pagination
      </button>
      <ResourcesAssociatedWithTopics
        data={data}
        loading={false}
        resetPagination={resetPagination}
        setResetPagination={setResetPagination}
        perPageNumber={perPage}
      />
    </>
  )
}

const renderResourcesAssociatedWithTopics = (data, perPage = 10) => {
  render(<TableMock data={data} perPage={perPage} />)
}

describe('Resources Associated with Topics', () => {
  afterEach(() => {
    fetchMock.restore()
  })

  it('renders correctly without data', async () => {
    renderResourcesAssociatedWithTopics(emptyData)

    expect(screen.getByText(/Resources associated with topics on Activity Reports/i)).toBeInTheDocument()
    expect(screen.getByText(/Topics/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Jan-22/i)).toBeInTheDocument()
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(screen.getByText(/Mar-22/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('columnheader', { name: /total/i })).toBeInTheDocument()
  })

  it('renders correctly with data', async () => {
    renderResourcesAssociatedWithTopics(mockData)

    expect(screen.getByText(/Resources associated with topics on Activity Reports/i)).toBeInTheDocument()
    expect(screen.getByText(/Topics/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Jan-22/i)).toBeInTheDocument()
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(screen.getByText(/Mar-22/i)).toBeInTheDocument()

      expect(screen.getByRole('link', { name: /https:\/\/official\.gov/i })).toBeInTheDocument()
      expect(screen.getByRole('cell', { name: /66/i })).toBeInTheDocument()
      expect(screen.getByRole('cell', { name: /77/i })).toBeInTheDocument()
      expect(screen.getByRole('cell', { name: /88/i })).toBeInTheDocument()
      expect(screen.getByRole('cell', { name: /99/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('columnheader', { name: /total/i })).toBeInTheDocument()
  })

  it('correctly handles value sort', async () => {
    renderResourcesAssociatedWithTopics(mockSortData)
    expect(screen.getByText(/Resources associated with topics on Activity Reports/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      const tableCells = screen.getAllByRole('cell')
      expect(tableCells[0]).toHaveTextContent(/secondrow/i)
      expect(tableCells[1]).toHaveTextContent(/2/i)
      expect(tableCells[2]).toHaveTextContent(/4/i)
      expect(tableCells[3]).toHaveTextContent(/firstrow/i)
      expect(tableCells[4]).toHaveTextContent(/1/i)
      expect(tableCells[5]).toHaveTextContent(/3/i)
    })

    // Sort.
    const sortColBtn = await screen.findByRole('button', { name: /feb-22\. activate to sort ascending/i })
    act(() => fireEvent.click(sortColBtn))

    await waitFor(() => {
      const tableCells = screen.getAllByRole('cell')
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(tableCells[0]).toHaveTextContent(/firstrow/i)
      expect(tableCells[1]).toHaveTextContent(/1/i)
      expect(tableCells[2]).toHaveTextContent(/3/i)
      expect(tableCells[3]).toHaveTextContent(/secondrow/i)
      expect(tableCells[4]).toHaveTextContent(/2/i)
      expect(tableCells[5]).toHaveTextContent(/4/i)
    })
  })

  it('correctly handles heading sort', async () => {
    renderResourcesAssociatedWithTopics(mockSortData)
    expect(screen.getByText(/Resources associated with topics on Activity Reports/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      const tableCells = screen.getAllByRole('cell')
      expect(tableCells[0]).toHaveTextContent(/secondrow/i)
      expect(tableCells[1]).toHaveTextContent(/2/i)
      expect(tableCells[2]).toHaveTextContent(/4/i)
      expect(tableCells[3]).toHaveTextContent(/firstrow/i)
      expect(tableCells[4]).toHaveTextContent(/1/i)
      expect(tableCells[5]).toHaveTextContent(/3/i)
    })

    // Sort.
    let sortColBtn = await screen.findByRole('button', { name: /topic\. activate to sort ascending/i })
    act(() => fireEvent.click(sortColBtn))

    const cellValues = [/firstrow/i, /1/i, /3/i, /secondrow/i, /2/i, /4/i]

    await waitFor(() => {
      const tableCells = screen.getAllByRole('cell')
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(tableCells[0]).toHaveTextContent(cellValues[0])
      expect(tableCells[1]).toHaveTextContent(cellValues[1])
      expect(tableCells[2]).toHaveTextContent(cellValues[2])
      expect(tableCells[3]).toHaveTextContent(cellValues[3])
      expect(tableCells[4]).toHaveTextContent(cellValues[4])
      expect(tableCells[5]).toHaveTextContent(cellValues[5])
    })

    sortColBtn = await screen.findByRole('button', { name: /topic\. activate to sort descending/i })
    act(() => fireEvent.click(sortColBtn))
    await waitFor(() => {
      const tableCells = screen.getAllByRole('cell')
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(tableCells[0]).toHaveTextContent(/secondrow/i)
      expect(tableCells[1]).toHaveTextContent(/2/i)
      expect(tableCells[2]).toHaveTextContent(/4/i)
      expect(tableCells[3]).toHaveTextContent(/firstrow/i)
      expect(tableCells[4]).toHaveTextContent(/1/i)
      expect(tableCells[5]).toHaveTextContent(/3/i)
    })

    sortColBtn = await screen.findByRole('button', { name: /topic\. activate to sort ascending/i })
    act(() => fireEvent.click(sortColBtn))

    await waitFor(() => {
      const tableCells = screen.getAllByRole('cell')
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(tableCells[0]).toHaveTextContent(cellValues[0])
      expect(tableCells[1]).toHaveTextContent(cellValues[1])
      expect(tableCells[2]).toHaveTextContent(cellValues[2])
      expect(tableCells[3]).toHaveTextContent(cellValues[3])
      expect(tableCells[4]).toHaveTextContent(cellValues[4])
      expect(tableCells[5]).toHaveTextContent(cellValues[5])
    })
  })

  it('handles changing and resetting pagination', async () => {
    renderResourcesAssociatedWithTopics(mockSortData, 1)

    // On first page.
    expect(screen.getByText(/Resources associated with topics on Activity Reports/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /https:\/\/secondrow\.gov/i })).toBeInTheDocument()
    })

    // Go to second page.
    const pageTwoBtn = screen.getByRole('button', { name: /page 2/i })
    act(() => fireEvent.click(pageTwoBtn))

    await waitFor(() => {
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /https:\/\/firstrow\.gov/i })).toBeInTheDocument()
    })

    // Click reset.
    const [resetButton] = await screen.findAllByTestId('reset-pagination')
    act(() => fireEvent.click(resetButton))

    // Verify reset back to first page.
    expect(screen.getByText(/Resources associated with topics on Activity Reports/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /https:\/\/secondrow\.gov/i })).toBeInTheDocument()
    })

    // Click next >.
    const nextPageBtn = await screen.findByRole('button', { name: /next page/i })
    act(() => fireEvent.click(nextPageBtn))

    await waitFor(() => {
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /https:\/\/firstrow\.gov/i })).toBeInTheDocument()
    })

    // Click prev >.
    const prevPageBtn = await screen.findByRole('button', { name: /previous page/i })
    act(() => fireEvent.click(prevPageBtn))

    await waitFor(() => {
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /https:\/\/secondrow\.gov/i })).toBeInTheDocument()
    })
  })

  describe('parseValue', () => {
    it('returns a number if the value is a number', () => {
      expect(parseValue('1')).toEqual(1)
    })

    it('removes commas from a number', () => {
      expect(parseValue('1,000')).toEqual(1000)
    })

    it('returns a string if the value is not a number', () => {
      expect(parseValue('test')).toEqual('test')
    })
  })
})
