import React, { useState } from 'react'
import '@silevis/reactgrid/styles.css'
import SheetList from './SheetList'
import SheetDetails from './SheetDetails'
import './SS.scss'

function SS() {
  const [selectedSheetId, setSelectedSheetId] = useState(null)

  return (
    <div className="ttahub-SS-grid">
      <div className="ttahub-sheet-list">
        <SheetList onSelectSheet={(sheetId) => setSelectedSheetId(sheetId)} />
      </div>
      <div className="ttahub-sheet-details">
        <SheetDetails sheetId={selectedSheetId} />
      </div>
    </div>
  )
}
export default SS
