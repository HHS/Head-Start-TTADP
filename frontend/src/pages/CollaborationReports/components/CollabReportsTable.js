import React, { useState, useEffect } from 'react';
import {
  Table,
  Checkbox,
} from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import Container from '../../../components/Container';
import TableHeader from '../../../components/TableHeader';
import { parseCheckboxEvent } from '../../../Constants';
// TODO: These are from activity

// TODO: Addd filters as a dependency/prop in future
const CollabReportsTable = (props) => {
  const { title, emptyMsg, showCreateMsgOnEmpty } = props;
  // const [reports, setReports] = useState([]);

  // useEffect(() => {
  // // TODO: use real fetch to api to get reports
  //   setReports([]);
  // }, [reports]);
  const reports = []; // Placeholder for actual reports data
  return (
    <>
      <CollabReportsTablePrivate
        reports={reports}
        title={title}
        emptyMsg={emptyMsg}
        showCreateMsgOnEmpty={showCreateMsgOnEmpty}
      />
    </>
  );
};

// TODO: Keeping these two seperate for now because of checkboxes, may make sense to combine later
const CollabReportsTablePrivate = (props) => {
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
        hideMenu
        offset={offset}
        perPage={10}
      />
      { reports.length === 0 && (
        <Container className="landing" paddingX={0} paddingY={0} loading={loading}>
          <div className="text-center padding-10">
            <div>
              <strong>{ emptyMsg }</strong>
              { showCreateMsgOnEmpty && (
                <>
                  <br />
                  Document your work connecting Head Start programs with state-level systems.
                  <br />
                  To get started, click the &quot;New Collaboration Report&quot; button.
                </>
              )}
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

CollabReportsTable.defaultProps = {
  emptyMsg: 'You have no Collaboration Reports',
  showCreateMsgOnEmpty: false,
  title: 'Collaboration Reports',
};

CollabReportsTable.propTypes = {
  emptyMsg: PropTypes.string,
  showCreateMsgOnEmpty: PropTypes.bool,
  title: PropTypes.string,
};

CollabReportsTablePrivate.defaultProps = {
  offset: 0,
  loading: false,
  emptyMsg: 'You have no Collaboration Reports',
  showCreateMsgOnEmpty: false,
};

CollabReportsTablePrivate.propTypes = {
  emptyMsg: PropTypes.string,
  loading: PropTypes.bool,
  offset: PropTypes.number,
  // eslint-disable-next-line react/forbid-prop-types
  reports: PropTypes.arrayOf(PropTypes.object).isRequired,
  showCreateMsgOnEmpty: PropTypes.bool,
  title: PropTypes.string.isRequired,
};

export default CollabReportsTable;
