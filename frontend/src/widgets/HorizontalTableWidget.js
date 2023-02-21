/* eslint-disable react/no-array-index-key */
import React from 'react';
import PropTypes from 'prop-types';
import { Table, Grid } from '@trussworks/react-uswds';
import Container from '../components/Container';
import './HorizontalTableWidget.scss';

export default function HorizontalTableWidget(
  {
    title,
    subtitle,
    headers,
    data,
    loading,
    loadingLabel,
    firstHeading,
    lastHeading,
  },
) {
  return (
    <Container className="smarthub-horizontal-table-widget shadow-2" paddingX={3} paddingY={3} loading={loading} loadingLabel={loadingLabel}>
      <Grid row className="margin-bottom-1">
        <h2 className="smart-hub--table-widget-heading ttahub--dashboard-widget-heading margin-0">{title}</h2>
      </Grid>
      <Grid row className="smarthub-horizontal-table-widget-subtitle margin-bottom-3">
        {subtitle}
      </Grid>
      {/* a scrollable element must be keyboard accessible */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="usa-table-container--scrollable margin-top-0" tabIndex={0}>
        <Table fullWidth striped bordered={false}>
          <thead>
            <tr>
              <th className="smarthub-horizontal-table-first-column">
                {firstHeading}
              </th>
              {headers.map((h) => <th key={h.replace(' ', '_')} scope="col" className="text-left">{h}</th>)}
              <th className="smarthub-horizontal-table-last-column">
                {lastHeading}
              </th>
            </tr>
          </thead>
          <tbody>
            {
            data.map((r, index) => (
              <tr key={`horizontal_table_row_${index}`}>
                <td key={`horizontal_table_cell_label${index}`} className="smarthub-horizontal-table-first-column">
                  {
                    r.isUrl === 'true'
                      ? (
                        <a style={{ display: 'table-cell' }} title="Links to Resource" aria-label={`Links to Resource ${r.heading}`} href={r.heading} target="_blank" rel="noreferrer">
                          {r.heading}
                        </a>
                      )
                      : r.heading
                      }
                </td>
                {r.data.map((d, cellIndex) => (
                  <td key={`horizontal_table_cell_${cellIndex}`} className={d.title === 'total' ? 'smarthub-horizontal-table-last-column' : null}>
                    {d.value}
                  </td>
                ))}
              </tr>
            ))
            }
          </tbody>
        </Table>
      </div>
    </Container>
  );
}

HorizontalTableWidget.propTypes = {
  headers: PropTypes.arrayOf(PropTypes.string).isRequired,
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        count: PropTypes.number,
      }),
    ), PropTypes.shape({}),
  ]),
  loading: PropTypes.bool.isRequired,
  loadingLabel: PropTypes.string.isRequired,
  firstHeading: PropTypes.string.isRequired,
  lastHeading: PropTypes.string,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
};

HorizontalTableWidget.defaultProps = {
  data: [],
  lastHeading: 'Total',
  subtitle: null,
};
