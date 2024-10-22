/* eslint-disable react/no-array-index-key */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Table, Checkbox } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import colors from '../colors';
import { parseCheckboxEvent } from '../Constants';
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
    showTotalColumn,
    hideFirstColumnBorder,
    caption,
    footerData,
    selectAllIdPrefix,
  },
) {
  // State for select all check box.
  const [allCheckBoxesChecked, setAllCheckBoxesChecked] = useState(false);

  const getClassNamesFor = (name) => (sortConfig.sortBy === name ? sortConfig.direction : '');

  const makeCheckboxes = (itemsArr, checked) => (
    itemsArr.reduce((obj, d) => ({ ...obj, [d.id]: checked }), {})
  );

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
      <th key={displayName.replace(' ', '_')} className={classValues || 'bg-white text-left data-header'} scope="col" aria-sort={fullAriaSort}>
        <button
          type="button"
          tabIndex={0}
          onClick={() => {
            requestSort(name);
          }}
          className={`usa-button usa-button--unstyled sortable ${sortClassName}`}
          aria-label={`${displayName}. Activate to sort ${sortClassName === 'asc' ? 'descending' : 'ascending'
          }`}
        >
          {displayName}
        </button>
      </th>
    );
  };

  const handleUrl = (url) => {
    if (url.isInternalLink) {
      return (
        <Link to={url.link} className="text-overflow-ellipsis">
          {url.heading}
        </Link>
      );
    }
    return (
      <>
        <a href={url.link} target="_blank" rel="noreferrer" className="text-overflow-ellipsis">
          {url.heading}
        </a>
        {' '}
        {
        !url.hideLinkIcon && (
        <FontAwesomeIcon
          color={colors.ttahubBlue}
          icon={faArrowUpRightFromSquare}
          size="xs"
        />
        )
    }
      </>
    );
  };

  // When reports are updated, make sure all checkboxes are unchecked
  useEffect(() => {
    setAllCheckBoxesChecked(false);
    setCheckboxes(makeCheckboxes(data, false));
  }, [data, setCheckboxes]);

  const toggleSelectAll = (event) => {
    const { checked } = parseCheckboxEvent(event);

    if (checked === true) {
      setCheckboxes(makeCheckboxes(data, true));
      setAllCheckBoxesChecked(true);
    } else {
      setCheckboxes(makeCheckboxes(data, false));
      setAllCheckBoxesChecked(false);
    }
  };

  const handleReportSelect = (event) => {
    const { checked, value } = parseCheckboxEvent(event);
    if (checked === true) {
      setCheckboxes({ ...checkboxes, [value]: true });
    } else {
      if (allCheckBoxesChecked) {
        setAllCheckBoxesChecked(false);
      }
      setCheckboxes({ ...checkboxes, [value]: false });
    }
  };

  return (
    <div className="smarthub-horizontal-table-widget usa-table-container--scrollable margin-top-0 margin-bottom-0">
      <Table stackedStyle="default" fullWidth striped bordered={false}>
        <caption className="usa-sr-only">{caption}</caption>
        <thead>
          <tr className="bg-white border-bottom-0 text-bold">
            {
            enableCheckboxes && (
              <th className="width-8 checkbox-column">
                <Checkbox
                  id={`${selectAllIdPrefix}check-all-checkboxes`}
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
                ? renderSortableColumnHeader(firstHeading, firstHeading.replaceAll(' ', '_'), `smarthub-horizontal-table-first-column ${enableCheckboxes ? 'left-with-checkbox' : 'left-0'}`)
                : (
                  <th className={`smarthub-horizontal-table-first-column data-header ${enableCheckboxes ? 'left-with-checkbox' : 'left-0'}`}>
                    {firstHeading}
                  </th>
                )
            }
            {
            headers.map((h) => (enableSorting
              ? renderSortableColumnHeader(h, h.replaceAll(' ', '_'))
              : <th key={h.replace(' ', '_')} scope="col" className="text-left data-header">{h}</th>))
            }
            {
            showTotalColumn && (
              enableSorting
                ? renderSortableColumnHeader(lastHeading, lastHeading.replaceAll(' ', '_'), 'smarthub-horizontal-table-last-column border-bottom-0 bg-white position-0')
                : (
                  <th className="smarthub-horizontal-table-last-column border-bottom-0 bg-white position-0 data-header">
                    {lastHeading}
                  </th>
                )
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
                      <Checkbox id={r.id} label="" value={r.id} checked={checkboxes[r.id] || false} onChange={handleReportSelect} aria-label={`Select ${r.id}`} />
                    </td>
                  )
                }
                <td data-label={firstHeading} key={`horizontal_table_cell_label${index}`} className={`smarthub-horizontal-table-first-column text-overflow-ellipsis data-description ${enableCheckboxes ? 'left-with-checkbox' : 'left-0'} ${!hideFirstColumnBorder ? 'smarthub-horizontal-table-first-column-border' : ''}`}>
                  {
                    r.isUrl
                      ? handleUrl(r)
                      : r.heading
                      }
                </td>
                {(r.data || []).map((d, cellIndex) => (
                  <td data-label={d.title} key={`horizontal_table_cell_${cellIndex}`} className={d.title.toLowerCase() === 'total' ? 'smarthub-horizontal-table-last-column' : null}>
                    {d.value}
                  </td>
                ))}
              </tr>
            ))
            }
        </tbody>
        {footerData && (
          <tfoot>
            <tr>
              {footerData.map((f, index) => (
                <td key={`horizontal_table_footer_${index}`}>{f}</td>
              ))}
            </tr>
          </tfoot>
        )}
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
  selectAllIdPrefix: PropTypes.string,
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
  showTotalColumn: PropTypes.bool,
  hideFirstColumnBorder: PropTypes.bool,
  caption: PropTypes.string,
  footerData: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.arrayOf(PropTypes.string),
  ]),
};

HorizontalTableWidget.defaultProps = {
  footerData: false,
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
  showTotalColumn: true,
  hideFirstColumnBorder: false,
  caption: '',
  selectAllIdPrefix: null,
};
