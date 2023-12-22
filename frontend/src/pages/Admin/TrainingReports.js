import React from 'react';
import CsvImport from './components/CsvImport';

function TrainingReports() {
  const primaryIdColumn = 'Event ID';
  const typeName = 'Training Reports';
  const apiPathName = 'training-reports';

  const validCsvHeaders = [
    'Sheet Name',
    'Event ID',
    'Edit Title',
    'IST Name:',
    'Creator',
    'Event Organizer - Type of Event',
    'National Center(s) Requested',
    'Event Duration/# NC Days of Support',
    'Reason for Activity',
    'Target Population(s)',
    'Audience',
    'Overall Vision/Goal for the PD Event',
  ];

  const requiredCsvHeaders = [
    'Event ID',
    'Edit Title',
    'Creator',
  ];

  return (
    <>
      <CsvImport
        validCsvHeaders={validCsvHeaders}
        requiredCsvHeaders={requiredCsvHeaders}
        typeName={typeName}
        apiPathName={apiPathName}
        primaryIdColumn={primaryIdColumn}
      />
    </>
  );
}
export default TrainingReports;
