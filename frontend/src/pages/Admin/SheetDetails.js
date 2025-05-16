import React, { useEffect, useState } from 'react';
import { ReactGrid } from '@silevis/reactgrid';
import PropTypes from 'prop-types';
import '@silevis/reactgrid/styles.css';
import { Alert } from '@trussworks/react-uswds';
import { getSheetById } from '../../fetchers/ss';

const SheetDetails = ({ sheetId }) => {
  const [activeSheet, setActiveSheet] = useState(null);
  const [error, setError] = useState();
  let rows;

  useEffect(() => {
    const loadSheetDetails = async () => {
      setError(null);
      try {
        const data = await getSheetById(sheetId);
        setActiveSheet(data);
      } catch (e) {
        setError(`Error fetching sheet: ${sheetId}`);
        setActiveSheet(null);
      }
    };

    if (sheetId) {
      loadSheetDetails();
    }
  }, [sheetId]);

  if (activeSheet) {
    const getCells = () => {
      const col = activeSheet.columns;
      return col ? col.map((el) => ({ type: 'header', text: el.title })) : [];
    };

    const headerRow = {
      rowId: 'header',
      cells: getCells(),
    };

    const getSheetRows = (entries = []) => [
      headerRow,
      ...entries.map((entry, idx) => ({
        rowId: idx,
        cells: entry.cells.map((el) => ({ type: 'text', text: el.value ? el.value.toString() : '' })),
      })),
    ];

    rows = getSheetRows(activeSheet.rows);
  }

  return (
    <div>
      {error && (
        <Alert type="error" className="margin-bottom-4 maxw-mobile-lg" noIcon>
          {error}
        </Alert>
      )}
      {activeSheet ? (
        <div>
          <h3>{activeSheet.name}</h3>
          <ReactGrid rows={rows} columns={activeSheet.columns} />
        </div>
      ) : (
        <p>Sheet details will show here...</p>
      )}
    </div>
  );
};

SheetDetails.propTypes = {
  sheetId: PropTypes.string,
};
SheetDetails.defaultProps = {
  sheetId: null,
};

export default SheetDetails;
