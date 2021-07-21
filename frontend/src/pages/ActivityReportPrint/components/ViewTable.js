import React from 'react';
import PropTypes from 'prop-types';
import './ViewTable.css';

export default function ViewTable({ caption, headings, data }) {
  return (
    <div className="ttahub-activity-report-view-table-container margin-bottom-2">
      <table className="usa-table">
        <caption className="padding-y-1 padding-left-2">{caption}</caption>
        <tbody>
          { headings.map((heading, index) => (
            <tr>
              <th scope="row">{heading}</th>
              <td>
                {data[index] ? data[index] : ''}
              </td>
            </tr>
          ))}

        </tbody>
      </table>
    </div>
  );
}

ViewTable.propTypes = {
  caption: PropTypes.string.isRequired,
  headings: PropTypes.arrayOf(PropTypes.string).isRequired,
  data: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])).isRequired,
};
