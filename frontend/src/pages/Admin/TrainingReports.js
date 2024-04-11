import React from 'react';
import CsvImport from './components/CsvImport';

function TrainingReports() {
  const primaryIdColumn = 'Event ID';
  const typeName = 'training reports';
  const apiPathName = 'training-reports';

  const requiredCsvHeaders = [
    'Event ID',
    'Edit Title',
    'Creator',
  ];

  return (
    <>
      <CsvImport
        requiredCsvHeaders={requiredCsvHeaders}
        typeName={typeName}
        apiPathName={apiPathName}
        primaryIdColumn={primaryIdColumn}
      />
    </>
  );
}
export default TrainingReports;
