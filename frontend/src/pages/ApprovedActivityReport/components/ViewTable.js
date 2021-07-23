import React from 'react';
import PropTypes from 'prop-types';
import './ViewTable.css';

function renderData(data) {
  if (Array.isArray(data)) {
    return <ul>{data.map((line) => <li>{line}</li>)}</ul>;
  }

  // eslint-disable-next-line react/no-danger
  return <span dangerouslySetInnerHTML={{ __html: data }} />;
}

export default function ViewTable({ caption, headings, data }) {
  return (
    <div className="ttahub-activity-report-view-table-container margin-bottom-2">
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
  caption: PropTypes.string.isRequired,
  headings: PropTypes.arrayOf(PropTypes.string).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  data: PropTypes.array,
  // data: PropTypes.array(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
};

ViewTable.defaultProps = {
  data: [],
};
