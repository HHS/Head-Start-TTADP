import React from 'react';
import PropTypes from 'prop-types';
import { Table } from '@trussworks/react-uswds';
import Container from '../components/Container';
import DateTime from '../components/DateTime';
import './TableWidget.css';

export default function TableWidget(
  {
    data,
    headings,
    dateTime,
    showDateTime,
    loading,
    loadingLabel,
    title,
    renderData,
  },
) {
  return (
    <Container className="smarthub-table-widget shadow-2" padding={3} loading={loading} loadingLabel={loadingLabel}>
      <div className="usa-table-container--scrollable margin-top-0">
        <Table className="smart-hub--table-widget-table" fullWidth>
          <caption className="smart-hub--table-widget-caption">
            <div className="display-flex flex-wrap flex-align-center">
              <h2 className="smart-hub--table-widget-heading ttahub--dashboard-widget-heading margin-0">{title}</h2>
              {showDateTime && <DateTime classNames="margin-left-1 padding-x-1" timestamp={dateTime.timestamp} label={dateTime.label} /> }
            </div>
          </caption>
          <thead>
            <tr>
              {headings.map((heading) => <th key={heading.replace(' ', '_')} scope="col" className="text-left">{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            { renderData(data) }
          </tbody>
        </Table>
      </div>
    </Container>
  );
}

TableWidget.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        count: PropTypes.number,
      }),
    ), PropTypes.shape({}),
  ]),
  dateTime: PropTypes.shape({
    timestamp: PropTypes.string,
    label: PropTypes.string,
  }),
  loading: PropTypes.bool.isRequired,
  loadingLabel: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  headings: PropTypes.arrayOf(PropTypes.string).isRequired,
  renderData: PropTypes.func.isRequired,
  showDateTime: PropTypes.bool,
};

TableWidget.defaultProps = {
  showDateTime: true,
  dateTime: {
    timestamp: '',
    label: '',
  },
  data: [],
};
