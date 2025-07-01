import React, { useState, useEffect } from 'react';
import {
  Table,
  Checkbox,
} from '@trussworks/react-uswds';
import Container from '../../../components/Container';
import TableHeader from '../../../components/TableHeader';
import { parseCheckboxEvent } from '../../../Constants';
// TODO: These are from activity

// TODO: Addd filters as a dependency/prop in future
const CollabReportsTable = () => {
  // const [reports, setReports] = useState([]);

  // useEffect(() => {
  // // TODO: use real fetch to api to get reports
  //   setReports([]);
  // }, [reports]);
  const reports = []; // Placeholder for actual reports data
  return (
    <>
      <CollabReportsTablePrivate reports={reports} />
    </>
  );
};

const CollabReportsTablePrivate = ({
  offset = 0, loading, reports = [], title = 'Collaboration Reports',
}) => {
  const [reportCheckboxes, setReportCheckboxes] = useState([]);
  const reportsCount = reports?.length ?? 0;

  useEffect(() => {
    setReportCheckboxes([]);
  }, [reports]);

  const toggleSelectAll = (event) => {
    const { checked } = parseCheckboxEvent(event);
    const boxes = checked ? reports.map((report) => report.id) : [];
    setReportCheckboxes(boxes);
  };

  // TODO: End checkbox stuff
  const allReportsChecked = reports.every((report) => reportCheckboxes.includes(report.id));

  const numberOfSelectedReports = reportCheckboxes?.length ?? 0;
  return (
    <Container className="landing inline-size-auto maxw-full position-relative" paddingX={0} paddingY={0} loading={loading} loadingLabel="Collaboration reports table loading">
      <TableHeader
        title={title}
        numberOfSelected={numberOfSelectedReports}
        toggleSelectAll={toggleSelectAll}
        count={reportsCount}
        offset={offset}
        perPage={10}
      />
      { reports.length === 0 && (
        <Container className="landing" paddingX={0} paddingY={0} loading={loading}>
          <div className="text-center padding-10">
            <div>
              <h2>You have no approved Collaboration Reports.</h2>
            </div>
          </div>
        </Container>
      )}
      { reports.length > 0 && (
      <div className="usa-table-container--scrollable">
        <Table fullWidth striped stackedStyle="default">
          <caption className="usa-sr-only">
            {title}
            with sorting and pagination
          </caption>
          <thead>
            <tr>
              <th
                className="width-8 tta-smarthub--report-heading"
                aria-label="Select"
              >
                <Checkbox
                  id="all-reports"
                  label=""
                  onChange={toggleSelectAll}
                  checked={allReportsChecked}
                  aria-label="Select or de-select all reports"
                />
              </th>
            </tr>
          </thead>
        </Table>
      </div>
      )}
    </Container>
  );
};
export default CollabReportsTable;
