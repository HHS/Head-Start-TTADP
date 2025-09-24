import React from 'react';
import PropTypes from 'prop-types';
import { Table } from '@trussworks/react-uswds';
import Container from '../components/Container';
import './TableWidget.css';
import WidgetH2 from '../components/WidgetH2';

export default function TableWidget(
  {
    data,
    headings,
    loading,
    loadingLabel,
    title,
    renderData,
    className,
  },
) {
  return (
    <Container className={`smarthub-table-widget shadow-2 ${className}`} loading={loading} loadingLabel={loadingLabel}>
      {/* a scrollable element must be keyboard accessible */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="usa-table-container--scrollable margin-top-0" tabIndex={0}>
        <Table fullWidth striped bordered={false}>
          <caption className="smart-hub--table-widget-caption">
            <div className="display-flex flex-wrap flex-align-center">
              <WidgetH2>
                {title}
              </WidgetH2>
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
  loading: PropTypes.bool.isRequired,
  loadingLabel: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  headings: PropTypes.arrayOf(PropTypes.string).isRequired,
  renderData: PropTypes.func.isRequired,
  className: PropTypes.string,
};

TableWidget.defaultProps = {
  data: [],
  className: '',
};
