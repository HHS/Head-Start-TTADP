import React from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import { renderData } from '../helpers';
import './ViewTable.scss';

export default function ViewTable({
  caption, headings, data, className, allowBreakWithin,
}) {
  return (
    <div className={`ttahub-activity-report-view-table-container margin-bottom-2 ${className}`}>
      <table className={`ttahub-activity-report-view-table usa-table usa-table--striped ${allowBreakWithin ? 'allow-break-within' : 'no-break-within'}`}>
        <caption className="padding-y-1 padding-left-2">{caption}</caption>
        <tbody>
          {headings.map((heading, index) => (
            <tr key={uuidv4()}>
              <th scope="row">{heading}</th>
              <td>
                {data[index] ? renderData(heading, data[index]) : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

ViewTable.propTypes = {
  allowBreakWithin: PropTypes.bool,
  className: PropTypes.string,
  caption: PropTypes.string.isRequired,
  headings: PropTypes.arrayOf(PropTypes.string).isRequired,
  data: PropTypes.arrayOf(
    PropTypes.oneOfType(
      [
        PropTypes.node,
        PropTypes.arrayOf(
          PropTypes.node,
        ),
      ],
    ),
  ),
};

ViewTable.defaultProps = {
  allowBreakWithin: true,
  className: '',
  data: [],
};
