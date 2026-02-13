import { useCallback } from 'react'
import { IS } from '../Constants'
import { blobToCsvDownload } from '../utils'

export default function useAsyncWidgetExport(checkboxes, exportName, sortConfig, fetcher, filters = []) {
  const exportRows = useCallback(
    async (exportType) => {
      // Clone the filters to avoid mutating the original array
      const fs = filters.map((filter) => ({ ...filter }))

      if (exportType === 'selected') {
        const selectedRowsIds = Object.keys(checkboxes).filter((key) => checkboxes[key])
        selectedRowsIds.forEach((id) => {
          fs.push({
            topic: 'id',
            condition: IS,
            query: id,
          })
        })
      }

      try {
        const blob = await fetcher(sortConfig.sortBy, sortConfig.direction, 0, false, fs, 'csv')
        blobToCsvDownload(blob, exportName)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },
    [checkboxes, exportName, fetcher, filters, sortConfig.direction, sortConfig.sortBy]
  )

  return {
    exportRows,
  }
}
