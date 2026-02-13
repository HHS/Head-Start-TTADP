import { useCallback } from 'react'
import { blobToCsvDownload, checkboxesToIds } from '../utils'

export default function useWidgetExport(
  data,
  headers,
  checkboxes,
  exportHeading,
  exportName,
  exportDataName = null // Specify the data to export.
) {
  const exportRows = useCallback(
    (exportType) => {
      try {
        let dataToExport = data
        if (exportType === 'selected') {
          const selectedRowsIds = checkboxesToIds(checkboxes)
          // Filter the recipients to export to only include the selected rows.
          dataToExport = data.filter((row) => selectedRowsIds.includes(row.id))
        }

        // Create a header row.
        const headerData = headers.map((h) => ({ title: h, value: h }))
        dataToExport = [
          {
            heading: exportHeading,
            data: headerData,
          },
          ...dataToExport,
        ]

        // create a csv file of all the rows.
        const csvRows = dataToExport.map((row) => {
          const dataToUse = !row.data && exportDataName ? row[exportDataName] : row.data
          const rowValues = dataToUse.map((d) => {
            const { value } = d
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
          })
          // If the heading has a comma, wrap it in quotes.
          const rowHeadingToUse = row.heading.includes(',') ? `"${row.heading}"` : row.heading
          return `${rowHeadingToUse},${rowValues.join(',')}`
        })
        // Create CSV.
        const csvString = csvRows.join('\n')
        const blob = new Blob([csvString], { type: 'text/csv' })
        blobToCsvDownload(blob, exportName)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },
    [checkboxes, data, exportHeading, exportName, headers, exportDataName]
  )

  return {
    exportRows,
  }
}
