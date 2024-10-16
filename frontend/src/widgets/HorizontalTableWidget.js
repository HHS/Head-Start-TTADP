/* eslint-disable react/no-array-index-key */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Table, Checkbox } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import colors from '../colors';
import './HorizontalTableWidget.scss';

export default function HorizontalTableWidget(
  {
    headers,
    data,
    firstHeading,
    enableSorting,
    lastHeading,
    sortConfig,
    requestSort,
    enableCheckboxes,
    checkboxes,
    setCheckboxes,
  },
) {
  // State for select all check box.
  const [allCheckBoxesChecked, setAllCheckBoxesChecked] = useState(false);

  const getClassNamesFor = (name) => (sortConfig.sortBy === name ? sortConfig.direction : '');

  const makeCheckboxes = (itemsArr, checked) => (
    itemsArr.reduce((obj, d) => ({ ...obj, [d.id]: checked }), {})
  );

  const renderSortableColumnHeader = (displayName, key, name, classValues) => {
    const sortClassName = getClassNamesFor(key);
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
      <th key={key} className={classValues || 'bg-white text-left data-header'} scope="col" aria-sort={fullAriaSort}>
        <button
          type="button"
          tabIndex={0}
          onClick={() => {
            requestSort(key);
          }}
          className={`usa-button usa-button--unstyled sortable ${sortClassName}`}
          aria-label={`${name}. Activate to sort ${sortClassName === 'asc' ? 'descending' : 'ascending'
          }`}
        >
          {displayName}
        </button>
      </th>
    );
  };

  const handleUrl = (url) => (
    <>
      <a href={url.link} target="_blank" rel="noreferrer" className="text-overflow-ellipsis">
        {url.heading}
      </a>
      {' '}
      <FontAwesomeIcon
        color={colors.ttahubBlue}
        icon={faArrowUpRightFromSquare}
        size="xs"
      />
    </>
  );

  // When reports are updated, make sure all checkboxes are unchecked
  useEffect(() => {
    setAllCheckBoxesChecked(false);
    setCheckboxes(makeCheckboxes(data, false));
  }, [data, setCheckboxes]);

  const toggleSelectAll = (event) => {
    const { target: { checked = null } = {} } = event;

    if (checked === true) {
      setCheckboxes(makeCheckboxes(data, true));
      setAllCheckBoxesChecked(true);
    } else {
      setCheckboxes(makeCheckboxes(data, false));
      setAllCheckBoxesChecked(false);
    }
  };

  const handleReportSelect = (event) => {
    const { target: { checked = null, value = null } = {} } = event;
    if (checked === true) {
      setCheckboxes({ ...checkboxes, [value]: true });
    } else {
      if (allCheckBoxesChecked) {
        setAllCheckBoxesChecked(false);
      }
      setCheckboxes({ ...checkboxes, [value]: false });
    }
  };

  const Header = ({ header, sortingEnabled }) => {
    let displayName = header;
    let name = header;

    if (header.displayName) {
      displayName = header.displayName;
    }

    if (header.name) {
      name = header.name;
    }

    const key = displayName.replaceAll(' ', '_');

    if (sortingEnabled) {
      return renderSortableColumnHeader(displayName, key, name);
    }

    return (
      <th key={key} scope="col" className="text-left data-header">
        <span className="usa-sr-only">{name}</span>
        <span aria-hidden="true">{displayName}</span>
      </th>
    );
  };

  Header.propTypes = {
    sortingEnabled: PropTypes.bool.isRequired,
    header: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        displayName: PropTypes.string,
        name: PropTypes.string,
      }),
    ]).isRequired,
  };

  return (
    <div className="smarthub-horizontal-table-widget usa-table-container--scrollable margin-top-0 margin-bottom-0">
      <Table stackedStyle="default" fullWidth striped bordered={false}>
        <thead>
          <tr className="bg-white border-bottom-0 text-bold">
            {
            enableCheckboxes && (
              <th className="width-8 checkbox-column">
                <Checkbox
                  id="check-all-checkboxes"
                  name="check-all-checkboxes"
                  label=""
                  onChange={toggleSelectAll}
                  checked={allCheckBoxesChecked}
                  aria-label="Select or de-select all"
                />
              </th>
            )
            }
            {
              enableSorting
                ? renderSortableColumnHeader(firstHeading, firstHeading.replaceAll(' ', '_'), firstHeading, `smarthub-horizontal-table-first-column ${enableCheckboxes ? 'left-with-checkbox' : 'left-0'}`)
                : (
                  <th className={`smarthub-horizontal-table-first-column data-header ${enableCheckboxes ? 'left-with-checkbox' : 'left-0'}`}>
                    {firstHeading}
                  </th>
                )
            }
            {
            headers.map((h) => (<Header header={h} sortingEnabled={enableSorting} />))
            }
            {
            enableSorting
              ? renderSortableColumnHeader(lastHeading, lastHeading.replaceAll(' ', '_'), 'smarthub-horizontal-table-last-column border-bottom-0 bg-white position-0')
              : (
                <th className="smarthub-horizontal-table-last-column border-bottom-0 bg-white position-0 data-header">
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
                {
                  enableCheckboxes && (
                    <td className="width-8 checkbox-column" data-label="Select report">
                      <Checkbox id={r.id} label="" value={r.id} checked={checkboxes[r.id] || false} onChange={handleReportSelect} aria-label={`Select ${r.title}`} />
                    </td>
                  )
                }
                <td data-label={firstHeading} key={`horizontal_table_cell_label${index}`} className={`smarthub-horizontal-table-first-column text-overflow-ellipsis data-description ${enableCheckboxes ? 'left-with-checkbox' : 'left-0'}`}>
                  {
                    r.isUrl
                      ? handleUrl(r)
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
        label: PropTypes.string,
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
  enableCheckboxes: PropTypes.bool,
  checkboxes: PropTypes.shape({}),
  setCheckboxes: PropTypes.func,
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
  enableCheckboxes: false,
  checkboxes: {},
  setCheckboxes: () => {},
};
