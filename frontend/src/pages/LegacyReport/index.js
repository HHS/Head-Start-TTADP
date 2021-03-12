import React, { useEffect, useState } from 'react';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Helmet } from 'react-helmet';
import { Table } from '@trussworks/react-uswds';
import { map } from 'lodash';

import Container from '../../components/Container';
import { legacyReportById } from '../../fetchers/activityReports';
import reportColumns from './reportColumns';

function LegacyReport({ match }) {
  const { params: { legacyId } } = match;
  const [legacyReport, updateLegacyReport] = useState();
  const [loading, updateLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      const report = await legacyReportById(legacyId);
      updateLegacyReport(report);
      updateLoading(false);
    };
    fetchReport();
  }, [legacyId]);

  if (loading) {
    return (
      <div>
        loading...
      </div>
    );
  }

  const { imported } = legacyReport;
  const entries = map(reportColumns, (display, field) => {
    const value = imported[field];
    return {
      display,
      field,
      value,
    };
  });

  const tableEntries = entries.filter((item) => item.value).map(({ field, display, value }) => (
    <tr key={field}>
      <td>
        {display}
      </td>
      <td>
        {value}
      </td>
    </tr>
  ));

  return (
    <>
      <Helmet>
        <title>Legacy Report</title>
      </Helmet>
      <Container>
        <h2>
          Legacy report
          {' '}
          {legacyId}
        </h2>
        <Table className="usa-table">
          <thead>
            <tr key="heading">
              <th scope="col" className="width-card">
                Field
              </th>
              <th scope="col">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {tableEntries}
          </tbody>
        </Table>
      </Container>
    </>
  );
}

LegacyReport.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};

export default LegacyReport;
