import React, { useEffect, useState } from 'react';
import { Button } from '@trussworks/react-uswds';
import CsvImport from './components/CsvImport';
import { getCourses } from '../../fetchers/courses';

function Courses() {
  const [courses, setCourses] = useState();
  const primaryIdColumn = 'course name';
  const typeName = 'courses';
  const apiPathName = 'courses';

  useEffect(() => {
    async function get() {
      const response = await getCourses();
      setCourses(response);
    }

    if (!courses) {
      get();
    }
  }, [courses]);

  const exportCourses = () => {
    // export courses as CSV
    let csv = 'course name\n';
    courses.forEach((course) => {
      csv += `"${course.name}"\n`;
    });

    const hiddenElement = document.createElement('a');
    hiddenElement.href = `data:text/csv;charset=utf-8,${encodeURI(csv)}`;
    hiddenElement.target = '_blank';
    hiddenElement.download = 'courses.csv';
    hiddenElement.click();

    // cleanup el
    hiddenElement.remove();
  };

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

      {courses && (
      <Button
        outline
        type="button"
        onClick={exportCourses}
      >
        Export courses as CSV
      </Button>
      )}

    </>
  );
}
export default Courses;
