import { renderHook } from '@testing-library/react-hooks'
import useWidgetExport from '../useWidgetExport'
import { mockWindowProperty } from '../../testHelpers'

describe('useWidgetExport', () => {
  const createObjectURL = jest.fn()

  mockWindowProperty('URL', {
    createObjectURL,
    revokeObjectURL: jest.fn(),
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should export rows', () => {
    const data = [
      {
        id: 1,
        heading: 'Heading',
        data: [
          { title: 'ID', value: 1 },
          { title: 'Name', value: 'John Doe' },
        ],
      },
      {
        heading: 'Head,ing',
        id: 2,
        data: [
          { title: 'ID', value: 2 },
          { title: 'Name', value: 'Jane Doe' },
        ],
      },
    ]

    const headers = ['ID', 'Name']
    const checkboxes = { 1: true, 2: false }
    const exportHeading = 'Export Heading'
    const exportName = 'export.csv'

    const { result } = renderHook(() => useWidgetExport(data, headers, checkboxes, exportHeading, exportName))
    const { exportRows } = result.current

    exportRows()
    const csvString = 'Export Heading,ID,Name\n,1,John Doe\n,2,Jane Doe'

    const blob = new Blob([csvString], { type: 'text/csv' })

    expect(createObjectURL).toHaveBeenCalledWith(blob)
  })

  it('should export selected rows', () => {
    const data = [
      {
        id: 1,
        heading: 'Heading',
        data: [
          { title: 'ID', value: 1 },
          { title: 'Name', value: 'John Doe' },
        ],
      },
      {
        heading: 'Head,ing',
        id: 2,
        data: [
          { title: 'ID', value: 2 },
          { title: 'Name', value: 'Jane Doe' },
        ],
      },
    ]

    const headers = ['ID', 'Name']
    const checkboxes = { 1: true, 2: false }
    const exportHeading = 'Export Heading'
    const exportName = 'export.csv'

    const { result } = renderHook(() => useWidgetExport(data, headers, checkboxes, exportHeading, exportName))
    const { exportRows } = result.current

    exportRows('selected')
    const csvString = 'Export Heading,ID,Name\n,1,John Doe\n,2,Jane Doe'

    const blob = new Blob([csvString], { type: 'text/csv' })

    expect(createObjectURL).toHaveBeenCalledWith(blob)
  })

  it('exports a value with a comma', () => {
    const data = [
      {
        id: 1,
        heading: 'Heading',
        data: [
          { title: 'ID', value: 1 },
          { title: 'Name', value: 'John, Doe' },
        ],
      },
    ]

    const headers = ['ID', 'Name']
    const checkboxes = { 1: true }
    const exportHeading = 'Export Heading'
    const exportName = 'export.csv'

    const { result } = renderHook(() => useWidgetExport(data, headers, checkboxes, exportHeading, exportName))
    const { exportRows } = result.current

    exportRows()
    const csvString = 'Export Heading,ID,Name\n,1,"John, Doe"'

    const blob = new Blob([csvString], { type: 'text/csv' })

    expect(createObjectURL).toHaveBeenCalledWith(blob)
  })
})
