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
    enableSorting,
    lastHeading,
    sortConfig,
    requestSort,
  },
) {
  const getClassNamesFor = (name) => (sortConfig.sortBy === name ? sortConfig.direction : '');
  const renderSortableColumnHeader = (displayName, name, classValues) => {
    const sortClassName = getClassNamesFor(name);
    let fullAriaSort;
    switch (sortClassName) {
      case 'asc':
        fullAriaSort = 'ascending';
        break;
      case 'desc':
        fullAriaSort = 'descending';
        break;
      default:
        fullAriaSort = 'none';
        break;
    }
    return (
      <th key={displayName.replace(' ', '_')} className={classValues || 'bg-white text-left'} scope="col" aria-sort={fullAriaSort}>
        <button
          type="button"
          tabIndex={0}
          onClick={() => {
            requestSort(name);
          }}
          onKeyDown={() => requestSort(name)}
          className={`usa-button usa-button--unstyled sortable ${sortClassName}`}
          aria-label={`${displayName}. Activate to sort ${sortClassName === 'asc' ? 'descending' : 'ascending'
          }`}
        >
          {displayName}
        </button>
      </th>
    );
  };

  return (
    <div className="smarthub-horizontal-table-widget usa-table-container--scrollable margin-top-0 margin-bottom-0">
      <Table stackedStyle="default" fullWidth striped bordered={false}>
        <thead>
          <tr className="bg-white border-bottom-0 text-bold">
            {
              enableSorting
                ? renderSortableColumnHeader(firstHeading, firstHeading.replaceAll(' ', '_'), 'smarthub-horizontal-table-first-column')
                : (
                  <th className="smarthub-horizontal-table-first-column">
                    {firstHeading}
                  </th>
                )
            }
            {
            headers.map((h) => (enableSorting
              ? renderSortableColumnHeader(h, h.replaceAll(' ', '_'))
              : <th key={h.replace(' ', '_')} scope="col" className="text-left">{h}</th>))
            }
            {
            enableSorting
              ? renderSortableColumnHeader(lastHeading, lastHeading.replaceAll(' ', '_'), 'smarthub-horizontal-table-last-column border-bottom-0 bg-white position-0')
              : (
                <th className="smarthub-horizontal-table-last-column border-bottom-0 bg-white position-0">
                  {lastHeading}
                </th>
              )
}
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
  sortConfig: PropTypes.shape({
    sortBy: PropTypes.string,
    direction: PropTypes.string,
    activePage: PropTypes.number,
    offset: PropTypes.number,
  }),
  requestSort: PropTypes.func,
  enableSorting: PropTypes.bool,
};

HorizontalTableWidget.defaultProps = {
  data: [],
  lastHeading: 'Total',
  sortConfig: {
    sortBy: '',
    direction: 'asc',
    activePage: 1,
    offset: 0,
  },
  requestSort: () => {},
  enableSorting: false,
};
