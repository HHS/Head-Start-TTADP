import { useCallback, useEffect, useState } from 'react'
import { DECIMAL_BASE } from '@ttahub/common'
import useWidgetSorting from './useWidgetSorting'
import useWidgetExport from './useWidgetExport'

export const parseValue = (value) => {
  const noCommasValue = value.replaceAll(',', '')
  const parsedValue = parseInt(noCommasValue, DECIMAL_BASE)
  if (Number.isNaN(parsedValue)) {
    return value
  }
  return parsedValue
}

export default function useWidgetPaging(
  headers,
  localStorageKey,
  defaultSortConfig,
  perPageNumber,
  dataToUse,
  setDataToUse,
  resetPagination,
  setResetPagination,
  loading,
  checkBoxes,
  exportHeading,
  setDataPerPage,
  stringColumns = [],
  dateColumns = [],
  exportName,
  exportDataName = null,
  keyColumns = []
) {
  const { sortConfig, setSortConfig, requestSort } = useWidgetSorting(
    localStorageKey,
    defaultSortConfig,
    dataToUse,
    setDataToUse,
    stringColumns,
    dateColumns,
    keyColumns
  )

  const { exportRows } = useWidgetExport(dataToUse, headers, checkBoxes, exportHeading, exportName, exportDataName)

  const { activePage } = sortConfig
  const [offset, setOffset] = useState((activePage - 1) * perPageNumber)

  // a side effect that resets the pagination when the filters change
  useEffect(() => {
    if (resetPagination) {
      setSortConfig((prevSortConfig) => ({ ...prevSortConfig, activePage: 1 }))
      setOffset(0) // 0 times perpage = 0
      setResetPagination(false)
    }
  }, [resetPagination, setResetPagination, setSortConfig])

  useEffect(() => {
    setDataPerPage(dataToUse.slice(offset, offset + perPageNumber))
  }, [offset, perPageNumber, dataToUse, setDataPerPage])

  const handlePageChange = useCallback(
    (pageNumber) => {
      if (!loading) {
        // copy state
        const sort = { ...sortConfig }

        // mutate
        sort.activePage = pageNumber

        // store it
        setSortConfig(sort)
        setOffset((pageNumber - 1) * perPageNumber)
      }
    },
    [loading, perPageNumber, setSortConfig, sortConfig]
  )

  const sort = useCallback(
    (sortBy, direction) => {
      requestSort(sortBy, direction)
      setOffset(0)
    },
    [requestSort]
  )

  useEffect(() => {
    setDataPerPage(dataToUse.slice(offset, offset + perPageNumber))
  }, [offset, perPageNumber, dataToUse, setDataPerPage])

  return {
    offset,
    activePage,
    handlePageChange,
    requestSort: sort,
    exportRows,
    sortConfig,
    setSortConfig,
  }
}
