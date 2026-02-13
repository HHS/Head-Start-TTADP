import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Alert } from '@trussworks/react-uswds'
import { getSheets } from '../../fetchers/ss'

const SheetList = ({ onSelectSheet }) => {
  const [sheets, setSheets] = useState()
  const [error, setError] = useState()

  useEffect(() => {
    async function fetchSheets() {
      setError(null)
      try {
        const fetchedSheets = await getSheets()
        setSheets(fetchedSheets)
      } catch (e) {
        setError('Error fetching sheets')
        setSheets([])
      }
    }
    if (!sheets) {
      fetchSheets()
    }
  }, [sheets])

  if (!sheets) {
    return 'Loading sheets...'
  }

  return (
    <div>
      <h1>Sheet List</h1>
      {error && (
        <Alert type="error" className="margin-bottom-4 maxw-mobile-lg" noIcon>
          {error}
        </Alert>
      )}
      <ul>
        {sheets && sheets.data ? (
          sheets.data.map((sheet) => (
            <li key={sheet.id}>
              <button type="button" className="flag-label" onClick={() => onSelectSheet(sheet.permalink.split('/').pop())}>
                <strong>{sheet.name}</strong>
              </button>
            </li>
          ))
        ) : (
          <li>No sheets available</li>
        )}
      </ul>
    </div>
  )
}

SheetList.propTypes = {
  onSelectSheet: PropTypes.func.isRequired,
}

export default SheetList
