import React from 'react';
import CsvImport from './components/CsvImport';

function Courses() {
  const primaryIdColumn = 'Course Name';
  const typeName = 'courses';
  const apiPathName = 'courses';

  const validCsvHeaders = [
    'course name',
  ];

  const requiredCsvHeaders = [
    'course name',
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
export default Courses;
