/* eslint-disable react/no-array-index-key */
import React from 'react';
import PropTypes from 'prop-types';
import { Table } from '@trussworks/react-uswds';
import Container from '../components/Container';
import './HorizontalTableWidget.scss';

const trimLongURLs = (url) => {
  let newUrl = url;
  if (newUrl.length >= 40) {
    newUrl = newUrl.substring(0, 40);
    newUrl += '...';
  }
  return newUrl;
};

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
    <Container className="smarthub-horizontal-table-widget width-full shadow-2 padding-top-0" paddingX={0} paddingY={0} loading={loading} loadingLabel={loadingLabel}>
      <div className="margin-bottom-1 padding-top-3 padding-left-3 margin-bottom-3">
        <h2 className="smart-hub--table-widget-heading margin-0 font-sans-lg">{title}</h2>
        <p className="usa-prose margin-0">{subtitle}</p>
      </div>
      {/* a scrollable element must be keyboard accessible */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="usa-table-container--scrollable margin-top-0" tabIndex={0}>
        <Table stackedStyle="default" fullWidth striped bordered={false}>
          <thead>
            <tr className="bg-white border-bottom-0 text-bold">
              <th className="smarthub-horizontal-table-first-column">
                {firstHeading}
              </th>
              {headers.map((h) => <th key={h.replace(' ', '_')} scope="col" className="text-left">{h}</th>)}
              <th className="smarthub-horizontal-table-last-column border-bottom-0 bg-white position-0">
                {lastHeading}
              </th>
            </tr>
          </thead>
          <tbody>
            {
            data.map((r, index) => (
              <tr className="bg-white border-bottom-0 text-bold" key={`horizontal_table_row_${index}`}>
                <td data-label={firstHeading} key={`horizontal_table_cell_label${index}`} className="smarthub-horizontal-table-first-column">
                  {
                    r.isUrl
                      ? (
                        <a href={r.heading} target="_blank" rel="noreferrer">
                          {trimLongURLs(r.heading)}
                        </a>
                      )
                      : r.heading
                      }
                </td>
                {r.data.map((d, cellIndex) => (
                  <td data-label={d.title} key={`horizontal_table_cell_${cellIndex}`} className={d.title === 'Total' ? 'smarthub-horizontal-table-last-column' : null}>
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
