import React, { useState, useEffect } from 'react';
import {
  Table,
  Checkbox,
} from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import Container from '../../../components/Container';
import TableHeader from '../../../components/TableHeader';
import { parseCheckboxEvent } from '../../../Constants';

const CollabReportsTable = (props) => {
  const {
    emptyMsg, loading, offset, reports, showCreateMsgOnEmpty, title,
  } = props;
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

  const allReportsChecked = reports.every((report) => reportCheckboxes.includes(report.id));

  const numberOfSelectedReports = reportCheckboxes?.length ?? 0;
  return (
    <Container className="landing inline-size-auto maxw-full position-relative" paddingX={0} paddingY={0} loading={loading} loadingLabel="Collaboration reports table loading">
      <div className="border-bottom smart-hub-border-base-lighter">
        <TableHeader
          title={title}
          numberOfSelected={numberOfSelectedReports}
          toggleSelectAll={toggleSelectAll}
          count={reportsCount}
          hideMenu
          hideCountHeaderOnEmpty
          offset={offset}
          perPage={10}
        />
      </div>
      { reports.length === 0 && (
        <Container className="landing" paddingX={0} paddingY={0} loading={loading}>
          <div className="text-center padding-10">
            <p className="usa-prose text-center bold">
              <strong>{ emptyMsg }</strong>
              { showCreateMsgOnEmpty && (
              <>
                <br />
                Document your work connecting Head Start programs with state-level systems.
                <br />
                To get started, click the &quot;New Collaboration Report&quot; button.
              </>
              )}
            </p>
          </div>
        </Container>
      )}
      { reports.length > 0 && (
      <div className="usa-table-container--scrollable">
        <Table fullWidth striped stackedStyle="default">
          <caption className="usa-sr-only">
            {title}
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

CollabReportsTable.defaultProps = {
  offset: 0,
  loading: false,
  emptyMsg: 'You have no Collaboration Reports',
  showCreateMsgOnEmpty: false,
};

CollabReportsTable.propTypes = {
  emptyMsg: PropTypes.string,
  loading: PropTypes.bool,
  offset: PropTypes.number,
  // eslint-disable-next-line react/forbid-prop-types
  reports: PropTypes.arrayOf(PropTypes.object).isRequired,
  showCreateMsgOnEmpty: PropTypes.bool,
  title: PropTypes.string.isRequired,
};

export default CollabReportsTable;
