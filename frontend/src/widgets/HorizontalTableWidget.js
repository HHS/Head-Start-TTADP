/* eslint-disable react/no-array-index-key */
import React from 'react';
import PropTypes from 'prop-types';
import { Table } from '@trussworks/react-uswds';
import './HorizontalTableWidget.scss';

const trimLongURLs = (url) => {
  let newUrl = url;
  if (newUrl.length >= 35) {
    newUrl = newUrl.substring(0, 35);
    newUrl += '...';
  }
  return newUrl;
};

export default function HorizontalTableWidget(
  {
    headers,
    data,
    firstHeading,
    lastHeading,
  },
) {
  return (
    <div className="smarthub-horizontal-table-widget usa-table-container--scrollable margin-top-0 margin-bottom-0">
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
                        <a href={r.heading} target="_blank" rel="noreferrer" title={r.heading}>
                          {trimLongURLs(r.heading)}
                        </a>
                      )
                      : r.heading
                      }
                </td>
                {r.data.map((d, cellIndex) => (
                  <td data-label={d.title} key={`horizontal_table_cell_${cellIndex}`} className={d.title.toLowerCase() === 'total' ? 'smarthub-horizontal-table-last-column' : null}>
                    {d.value}
                  </td>
                ))}
              </tr>
            ))
            }
        </tbody>
      </Table>
    </div>
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
  firstHeading: PropTypes.string.isRequired,
  lastHeading: PropTypes.string,
};

HorizontalTableWidget.defaultProps = {
  data: [],
  lastHeading: 'Total',
};
