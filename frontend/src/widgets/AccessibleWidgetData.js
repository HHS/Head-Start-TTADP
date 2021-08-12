import React from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import './AccessibleWidgetData.css';

export default function AccessibleWidgetData({ caption, columnHeadings, rows }) {
  function renderRow(row) {
    return (
      <tr key={uuidv4()}>
        { row.heading ? <th scope="row">{row.heading}</th> : null }
        { row.data.map((rowData) => <td key={uuidv4()}>{rowData}</td>)}
      </tr>
    );
  }

  return (
    <table className="ttahub--accessible-widget-data usa-table usa-table--borderless usa-table--striped">
      <caption className="sr-only">
        {caption}
      </caption>
      <thead>
        <tr>
          {columnHeadings.map((heading) => <th key={uuidv4()} scope="col">{heading}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => renderRow(row))}
      </tbody>
    </table>
  );
}

AccessibleWidgetData.propTypes = {
  caption: PropTypes.string.isRequired,
  columnHeadings: PropTypes.arrayOf(PropTypes.string).isRequired,
  rows: PropTypes.arrayOf(PropTypes.shape({
    heading: PropTypes.string,
    data: PropTypes.arrayOf(PropTypes.string),
  })).isRequired,
};
