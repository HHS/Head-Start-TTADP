import '@testing-library/jest-dom'
import React from 'react'
import fetchMock from 'fetch-mock'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CoursesAssociatedWithActivityReports, { parseValue } from '../CoursesAssociatedWithActivityReports'

const origUrl = window.URL
const emptyData = {
  headers: ['Jan-22', 'Feb-22', 'Mar-22'],
  courses: [],
}

const mockData = {
  headers: ['Jan-22', 'Feb-22', 'Mar-22'],
  courses: [
    {
      id: 1,
      link: 'Sample Course 1',
      heading: 'Sample Course 1',
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
  courses: [
    {
      id: 1,
      link: 'Sample Course 2',
      heading: 'Sample Course 2',
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
      id: 2,
      link: 'Sample Course 1',
      heading: 'Sample Course 1',
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
      <CoursesAssociatedWithActivityReports
        data={data}
        loading={false}
        resetPagination={resetPagination}
        setResetPagination={setResetPagination}
        perPageNumber={perPage}
      />
    </>
  )
}

const renderCoursesAssociatedWithActivityReports = (data, perPage = 10) => {
  render(<TableMock data={data} perPage={perPage} />)
}

describe('iPD Courses Associated with Activity Reports', () => {
  afterEach(() => {
    fetchMock.restore()
    window.URL = origUrl
  })

  it('renders correctly without data', async () => {
    renderCoursesAssociatedWithActivityReports(emptyData)

    expect(screen.getByText(/iPD Courses cited on Activity Reports/i)).toBeInTheDocument()
    expect(screen.getByText(/Course name/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Jan-22/i)).toBeInTheDocument()
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(screen.getByText(/Mar-22/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('columnheader', { name: /total/i })).toBeInTheDocument()

    // Displays the foot note.
    expect(screen.getByText('* Collection of iPD courses in the TTA Hub began on March 7, 2024.')).toBeInTheDocument()
  })

  it('renders correctly with data', async () => {
    renderCoursesAssociatedWithActivityReports(mockData)

    expect(screen.getByText(/iPD Courses cited on Activity Reports/i)).toBeInTheDocument()
    expect(screen.getByText(/Course name/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Jan-22/i)).toBeInTheDocument()
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(screen.getByText(/Mar-22/i)).toBeInTheDocument()

      expect(screen.getByText(/Sample Course 1/i)).toBeInTheDocument()
      expect(screen.getByRole('cell', { name: /66/i })).toBeInTheDocument()
      expect(screen.getByRole('cell', { name: /77/i })).toBeInTheDocument()
      expect(screen.getByRole('cell', { name: /88/i })).toBeInTheDocument()
      expect(screen.getByRole('cell', { name: /99/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('columnheader', { name: /total/i })).toBeInTheDocument()

    // Displays the foot note.
    expect(screen.getByText('* Collection of iPD courses in the TTA Hub began on March 7, 2024.')).toBeInTheDocument()
  })

  it('correctly handles value sort', async () => {
    renderCoursesAssociatedWithActivityReports({
      headers: [...mockSortData.headers],
      courses: [
        ...mockSortData.courses,
        {
          id: 3,
          link: 'Sample Course 3',
          heading: 'Sample Course 3',
          isUrl: true,
          data: [
            {
              title: 'Feb-22',
              value: '2',
            },
            {
              title: 'total',
              value: '5',
            },
          ],
        },
      ],
    })
    expect(screen.getByText(/iPD Courses cited on Activity Reports/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      const tableCells = screen.getAllByRole('cell')

      expect(tableCells[1]).toHaveTextContent(/Sample Course 2/i)
      expect(tableCells[2]).toHaveTextContent(/2/i)
      expect(tableCells[3]).toHaveTextContent(/4/i)
      expect(tableCells[4]).toHaveTextContent('')
      expect(tableCells[5]).toHaveTextContent(/Sample Course 1/i)
      expect(tableCells[6]).toHaveTextContent(/1/i)
      expect(tableCells[7]).toHaveTextContent(/3/i)
      expect(tableCells[8]).toHaveTextContent('')
      expect(tableCells[9]).toHaveTextContent(/Sample Course 3/i)
      expect(tableCells[10]).toHaveTextContent(/2/i)
      expect(tableCells[11]).toHaveTextContent(/5/i)
    })

    // Sort.
    const sortColBtn = await screen.findByRole('button', { name: /feb-22\. activate to sort ascending/i })
    act(() => fireEvent.click(sortColBtn))

    await waitFor(() => {
      const tableCells = screen.getAllByRole('cell')
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(tableCells[1]).toHaveTextContent(/Sample Course 1/i)
      expect(tableCells[2]).toHaveTextContent(/1/i)
      expect(tableCells[3]).toHaveTextContent(/3/i)
      expect(tableCells[5]).toHaveTextContent(/Sample Course 2/i)
      expect(tableCells[6]).toHaveTextContent(/2/i)
      expect(tableCells[7]).toHaveTextContent(/4/i)
      expect(tableCells[9]).toHaveTextContent(/Sample Course 3/i)
      expect(tableCells[10]).toHaveTextContent(/2/i)
      expect(tableCells[11]).toHaveTextContent(/5/i)
    })
  })

  it('correctly handles heading sort', async () => {
    renderCoursesAssociatedWithActivityReports(mockSortData)
    expect(screen.getByText(/iPD Courses cited on Activity Reports/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      const tableCells = screen.getAllByRole('cell')
      expect(tableCells[1]).toHaveTextContent(/Sample Course 2/i)
      expect(tableCells[2]).toHaveTextContent(/2/i)
      expect(tableCells[3]).toHaveTextContent(/4/i)
      expect(tableCells[5]).toHaveTextContent(/Sample Course 1/i)
      expect(tableCells[6]).toHaveTextContent(/1/i)
      expect(tableCells[7]).toHaveTextContent(/3/i)
    })

    // Sort.
    let sortColBtn = await screen.findByRole('button', { name: /Course name. activate to sort ascending/i })
    const cellValues = [/Sample Course 1/i, /1/i, /3/i, /Sample Course 2/i, /2/i, /4/i]

    await act(async () => {
      fireEvent.click(sortColBtn)
      await waitFor(() => {
        const tableCells = screen.getAllByRole('cell')
        expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
        expect(tableCells[1]).toHaveTextContent(cellValues[0])
        expect(tableCells[2]).toHaveTextContent(cellValues[1])
        expect(tableCells[3]).toHaveTextContent(cellValues[2])
        expect(tableCells[5]).toHaveTextContent(cellValues[3])
        expect(tableCells[6]).toHaveTextContent(cellValues[4])
        expect(tableCells[7]).toHaveTextContent(cellValues[5])
      })
    })

    sortColBtn = await screen.findByRole('button', { name: /course name\. activate to sort descending/i })
    act(() => fireEvent.click(sortColBtn))
    await waitFor(() => {
      const tableCells = screen.getAllByRole('cell')
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(tableCells[1]).toHaveTextContent(/Sample Course 2/i)
      expect(tableCells[2]).toHaveTextContent(/2/i)
      expect(tableCells[3]).toHaveTextContent(/4/i)
      expect(tableCells[5]).toHaveTextContent(/Sample Course 1/i)
      expect(tableCells[6]).toHaveTextContent(/1/i)
      expect(tableCells[7]).toHaveTextContent(/3/i)
    })

    sortColBtn = await screen.findByRole('button', { name: /course name\. activate to sort ascending/i })
    act(() => fireEvent.click(sortColBtn))

    await waitFor(() => {
      const tableCells = screen.getAllByRole('cell')
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(tableCells[1]).toHaveTextContent(cellValues[0])
      expect(tableCells[2]).toHaveTextContent(cellValues[1])
      expect(tableCells[3]).toHaveTextContent(cellValues[2])
      expect(tableCells[5]).toHaveTextContent(cellValues[3])
      expect(tableCells[6]).toHaveTextContent(cellValues[4])
      expect(tableCells[7]).toHaveTextContent(cellValues[5])
    })
  })

  it('handles changing and resetting pagination', async () => {
    renderCoursesAssociatedWithActivityReports(mockSortData, 1)

    // On first page.
    expect(screen.getByText(/iPD Courses cited on Activity Reports/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(screen.getByText(/Sample Course 2/i)).toBeInTheDocument()
    })

    // Go to second page.
    const pageTwoBtn = screen.getByRole('button', { name: /page 2/i })
    act(() => fireEvent.click(pageTwoBtn))

    await waitFor(() => {
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(screen.getByText(/Sample Course 1/i)).toBeInTheDocument()
    })

    // Click reset.
    const [resetButton] = await screen.findAllByTestId('reset-pagination')
    act(() => fireEvent.click(resetButton))

    // Verify reset back to first page.
    expect(screen.getByText(/iPD Courses cited on Activity Reports/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(screen.getByText(/Sample Course 2/i)).toBeInTheDocument()
    })

    // Click next >.
    const nextPageBtn = await screen.findByRole('button', { name: /next page/i })
    act(() => fireEvent.click(nextPageBtn))

    await waitFor(() => {
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(screen.getByText(/Sample Course 1/i)).toBeInTheDocument()
    })

    // Click prev >.
    const prevPageBtn = await screen.findByRole('button', { name: /previous page/i })
    act(() => fireEvent.click(prevPageBtn))

    await waitFor(() => {
      expect(screen.getByText(/Feb-22/i)).toBeInTheDocument()
      expect(screen.getByText(/Sample Course 2/i)).toBeInTheDocument()
    })
  })

  it('clears all selected check boxes when sorting', async () => {
    renderCoursesAssociatedWithActivityReports(mockSortData)

    // get the check box with the id check-all-checkboxes
    const checkAllCheckBox = screen.getByRole('checkbox', { name: /select or de-select all/i })

    // check the check box
    fireEvent.click(checkAllCheckBox)

    // assert all check boxes are selected
    let checkBoxes = screen.getAllByRole('checkbox')
    checkBoxes.forEach((checkBox) => {
      expect(checkBox).toBeChecked()
    })

    // Sort.
    const sortColBtn = screen.getByRole('button', { name: /feb-22\. activate to sort ascending/i })
    act(() => fireEvent.click(sortColBtn))

    // assert all check boxes are not selected
    checkBoxes = screen.getAllByRole('checkbox')

    checkBoxes.forEach((checkBox) => {
      expect(checkBox).not.toBeChecked()
    })
  })

  it('clears all selected check boxes when paging', async () => {
    renderCoursesAssociatedWithActivityReports(mockSortData, 1)

    // get the check box with the id check-all-checkboxes
    const checkAllCheckBox = screen.getByRole('checkbox', { name: /select or de-select all/i })
    fireEvent.click(checkAllCheckBox)

    // assert all check boxes are selected
    let checkBoxes = screen.getAllByRole('checkbox')
    checkBoxes.forEach((checkBox) => {
      expect(checkBox).toBeChecked()
    })

    // Go to second page.
    const pageTwoBtn = screen.getByRole('button', { name: /page 2/i })
    act(() => fireEvent.click(pageTwoBtn))

    // assert all check boxes are not selected
    checkBoxes = screen.getAllByRole('checkbox')

    checkBoxes.forEach((checkBox) => {
      expect(checkBox).not.toBeChecked()
    })
  })

  it('exports the selected rows', async () => {
    window.URL = {
      ...window.URL,
      revokeObjectURL: jest.fn(),
    }
    renderCoursesAssociatedWithActivityReports(mockSortData)

    // get the check box with the id check-all-checkboxes
    const allCb = screen.getByRole('checkbox', { name: /select or de-select all/i })
    fireEvent.click(allCb)

    // assert all check boxes are selected
    const cBs = screen.getAllByRole('checkbox')
    cBs.forEach((cb) => {
      expect(cb).toBeChecked()
    })

    // Click the context menu button.
    let contextMenuBtn = screen.getByTestId('context-menu-actions-btn')
    userEvent.click(contextMenuBtn)

    // Export selected rows.
    const exportTableBtn = screen.getByRole('button', { name: /export selected rows/i })
    userEvent.click(exportTableBtn)

    // select the element '<a download="courses.csv" hidden="" href="undefined" />'
    let downloadLink = document.querySelector('[download="courses.csv"]')
    expect(downloadLink).not.toBeNull()

    // Click the context menu button.
    contextMenuBtn = screen.getByTestId('context-menu-actions-btn')
    userEvent.click(contextMenuBtn)

    // Export all rows.
    const exportAllBtn = screen.getByRole('button', { name: /export table/i })
    userEvent.click(exportAllBtn)

    // Make sure there is a link with the name 'Download'.
    downloadLink = document.querySelector('[download="courses.csv"]')
    expect(downloadLink).not.toBeNull()
  })

  it('checking and then unchecking the select all checkbox', async () => {
    renderCoursesAssociatedWithActivityReports(mockSortData)

    // get the check box with the id check-all-checkboxes
    const checkAllCheckBox = screen.getByRole('checkbox', { name: /select or de-select all/i })

    // check the check box
    fireEvent.click(checkAllCheckBox)

    // assert all check boxes are selected
    let checkBoxes = screen.getAllByRole('checkbox')
    checkBoxes.forEach((checkBox) => {
      expect(checkBox).toBeChecked()
    })

    // uncheck the check box
    fireEvent.click(checkAllCheckBox)

    // assert all check boxes are not selected
    checkBoxes = screen.getAllByRole('checkbox')
    checkBoxes.forEach((checkBox) => {
      expect(checkBox).not.toBeChecked()
    })
  })

  it('checking all checkboxes and then unchecking one', async () => {
    renderCoursesAssociatedWithActivityReports(mockSortData)

    // get the check box with the id check-all-checkboxes
    const checkAllCheckBox = screen.getByRole('checkbox', { name: /select or de-select all/i })

    // check the check box
    fireEvent.click(checkAllCheckBox)

    // assert all check boxes are selected
    let checkBoxes = screen.getAllByRole('checkbox')
    checkBoxes.forEach((checkBox) => {
      expect(checkBox).toBeChecked()
    })

    // uncheck the first check box
    const firstCheckBox = checkBoxes[1]
    fireEvent.click(firstCheckBox)

    // assert all check boxes are not selected
    checkBoxes = screen.getAllByRole('checkbox')
    expect(checkBoxes[0]).not.toBeChecked()
    expect(checkBoxes[1]).not.toBeChecked()
    expect(checkBoxes[2]).toBeChecked()
  })

  it('selects a single checkbox without checking other checkboxes', async () => {
    renderCoursesAssociatedWithActivityReports(mockSortData)
    // assert all check boxes are selected
    let checkBoxes = screen.getAllByRole('checkbox')
    checkBoxes.forEach((checkBox) => {
      expect(checkBox).not.toBeChecked()
    })

    // uncheck the first check box
    const firstCheckBox = checkBoxes[1]
    fireEvent.click(firstCheckBox)

    // assert all check boxes are not selected
    checkBoxes = screen.getAllByRole('checkbox')
    expect(checkBoxes[0]).not.toBeChecked()
    expect(checkBoxes[1]).toBeChecked()
    expect(checkBoxes[2]).not.toBeChecked()
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
