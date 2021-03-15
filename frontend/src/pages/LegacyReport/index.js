import React, { useEffect, useState } from 'react';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Helmet } from 'react-helmet';
import { Alert, Table } from '@trussworks/react-uswds';
import { map } from 'lodash';

import Container from '../../components/Container';
import { legacyReportById } from '../../fetchers/activityReports';
import reportColumns from './reportColumns';

function LegacyReport({ match }) {
  const { params: { legacyId } } = match;
  const [legacyReport, updateLegacyReport] = useState();
  const [loading, updateLoading] = useState(true);
  const [error, updateError] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const report = await legacyReportById(legacyId);
        updateLegacyReport(report);
        updateError(false);
      } catch (e) {
        updateError('Unable to load activity report');
      } finally {
        updateLoading(false);
      }
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

  if (error) {
    return (
      <Alert type="error">
        {error}
      </Alert>
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
      <td className="text-top">
        {display}
      </td>
      <td>
        {value.split('\n').map((string) => <div key={string} className="margin-top-05">{string}</div>)}
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
