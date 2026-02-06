import React from 'react';
import PropTypes from 'prop-types';
import withWidgetData from './withWidgetData';
import Container from '../components/Container';
import WidgetH2 from '../components/WidgetH2';
import SimpleSortableTable from '../components/SimpleSortableTable';
import NoResultsFound from '../components/NoResultsFound';
import './StandardGoalList.scss';

export function StandardGoalsListTable({
  data,
  loading,
  title,
}) {
  // Define the columns for the SimpleSortableTable
  const columns = [
    { key: 'name', name: 'Goal category' },
    { key: 'count', name: '# of reports' },
  ];

  return (
    <Container paddingX={0} paddingY={1} loading={loading} loadingLabel="Goals list loading" className="ttahub-goal-counts-container margin-bottom-0 height-full">
      <div className="ttahub-goal-counts-table inline-size-auto maxw-full margin-bottom-0">
        <div className="display-flex flex-wrap flex-column flex-justify padding-3 goal-list-header">
          <WidgetH2 classNames="padding-0">
            {title}
          </WidgetH2>
          <p className="usa-prose padding-0 margin-0">Data reflects activity starting on 09/01/2025.</p>
        </div>
        {data && data.length > 0 ? (
          <div
            className="usa-table-container--scrollable"
          >
            <SimpleSortableTable
              data={data}
              columns={columns}
              className="width-full"
            />
          </div>
        ) : null}
      </div>
      {((!data || data.length === 0) || loading) && <NoResultsFound />}
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
