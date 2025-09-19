import React from 'react';
import PropTypes from 'prop-types';
import withWidgetData from './withWidgetData';
import Container from '../components/Container';
import WidgetH2 from '../components/WidgetH2';
import SimpleSortableTable from '../components/SimpleSortableTable';
import './StandardGoalList.css';

export function StandardGoalsListTable({
  data, loading, title,
}) {
  // Define the columns for the SimpleSortableTable
  const columns = [
    { key: 'name', name: 'Goal category' },
    { key: 'count', name: '# of goals' },
  ];

  return (
    <Container paddingX={1} paddingY={1} loading={loading} loadingLabel="Goals list loading">
      <div className="ttahub-goal-counts-table landing inline-size-auto maxw-full margin-bottom-0">
        <div className="display-flex flex-wrap flex-align-center">
          <WidgetH2 classNames="padding-3">
            {title || 'Goals categories in Activity Reports'}
          </WidgetH2>
        </div>
        <div
          className="usa-table-container--scrollable"
          style={{
            position: 'relative',
            maxHeight: '365px',
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
  title: PropTypes.string,
};

StandardGoalsListTable.defaultProps = {
  data: [],
  title: 'Goals categories in Activity Reports',
};

export default withWidgetData(StandardGoalsListTable, 'standardGoalsList');
