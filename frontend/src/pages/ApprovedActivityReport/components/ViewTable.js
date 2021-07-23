import React from 'react';
import PropTypes from 'prop-types';
import './ViewTable.css';

function renderData(data) {
  if (Array.isArray(data)) {
    return <ul>{data.map((line) => <li key={line}>{line}</li>)}</ul>;
  }

  // eslint-disable-next-line react/no-danger
  return <span dangerouslySetInnerHTML={{ __html: data }} />;
}

export default function ViewTable({
  caption, headings, data, className,
}) {
  return (
    <div className={`ttahub-activity-report-view-table-container margin-bottom-2 ${className}`}>
      <table className="ttahub-activity-report-view-table usa-table">
        <caption className="padding-y-1 padding-left-2">{caption}</caption>
        <tbody>
          { headings.map((heading, index) => (
            <tr key={`tr-${heading.toLowerCase().replace(' ', '-')}`}>
              <th scope="row">{heading}</th>
              <td>
                {data[index] ? renderData(data[index]) : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

ViewTable.propTypes = {
  className: PropTypes.string,
  caption: PropTypes.string.isRequired,
  headings: PropTypes.arrayOf(PropTypes.string).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  // data: PropTypes.array,
  data: PropTypes.arrayOf(
    PropTypes.oneOfType(
      [
        PropTypes.string,
        PropTypes.number,
        PropTypes.arrayOf(
          PropTypes.string,
        ),
      ],
    ),
  ),
};

ViewTable.defaultProps = {
  className: '',
  data: [],
};
