import React from 'react';
import PropTypes from 'prop-types';
import withWidgetData from './withWidgetData';
import Container from '../components/Container';
import WidgetH2 from '../components/WidgetH2';
import SimpleSortableTable from '../components/SimpleSortableTable';
import './StandardGoalList.scss';

export function StandardGoalsListTable({
  data, loading,
}) {
  // Define the columns for the SimpleSortableTable
  const columns = [
    { key: 'name', name: 'Goal category' },
    { key: 'count', name: '# of goals' },
  ];

  return (
    <Container paddingX={0} paddingY={1} loading={loading} loadingLabel="Goals list loading">
      <div className="ttahub-goal-counts-table inline-size-auto maxw-full margin-bottom-0">
        <div className="display-flex flex-wrap flex-align-center padding-3 goal-list-header">
          <WidgetH2 classNames="padding-0">
            Goals categories in Activity Reports
          </WidgetH2>
          <p className="usa-prose padding-0 margin-0">Data reflects activity starting on 09/01/2025.</p>
        </div>
        <div
          className="usa-table-container--scrollable"
          style={{
            position: 'relative',
            flex: '1 1 auto',
            overflowY: 'auto',
          }}
        >
          <SimpleSortableTable
            data={data || []}
            columns={columns}
            className="width-full"
          />
        </div>
      </div>
      {(!data || data.length === 0) && !loading && <p>No data available</p>}
    </Container>
  );
}

StandardGoalsListTable.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        count: PropTypes.number,
      }),
    ), PropTypes.shape({}),
  ]),
  loading: PropTypes.bool.isRequired,
};

StandardGoalsListTable.defaultProps = {
  data: [],
};

export default withWidgetData(StandardGoalsListTable, 'standardGoalsList');
