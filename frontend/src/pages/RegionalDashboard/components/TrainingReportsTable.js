import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useHistory } from 'react-router-dom';
import WidgetContainer from '../../../components/WidgetContainer';
import HorizontalTableWidget from '../../../widgets/HorizontalTableWidget';
import { DATE_DISPLAY_FORMAT } from '../../../Constants';
import TooltipWithCollection from '../../../components/TooltipWithCollection';
import { getSessionReportsCSV, getSessionReportsCSVById } from '../../../fetchers/session';
import { formatDateValue } from '../../../lib/dates';

const PER_PAGE = 10;

const idForLink = (eventId) => eventId.split('-').pop();

const TrainingReportsTable = ({
  emptyMsg,
  loading,
  title,
  data,
  requestSort,
  sortConfig,
  setSortConfig,
  filters,
}) => {
  const [reportCheckboxes, setReportCheckboxes] = useState({});
  const perPage = sortConfig.perPage || PER_PAGE;

  const selectedReports = useMemo(() => {
    const ids = [];
    Object.entries(reportCheckboxes).forEach(([key, value]) => {
      if (value) {
        ids.push(key);
      }
    });

    return ids;
  }, [reportCheckboxes]);

  const menuItems = [];

  if (data.rows.length) {
    menuItems.push(
      {
        label: 'Export table',
        onClick: async () => getSessionReportsCSV(sortConfig, filters),
      },
    );
  }

  if (selectedReports.length) {
    menuItems.unshift(
      {
        label: 'Export selected rows',
        onClick: async () => getSessionReportsCSVById(selectedReports, sortConfig, filters),
      },
    );
  }

  const handlePageChange = useCallback((pageNumber) => {
    setSortConfig((previousConfig) => ({
      ...previousConfig,
      activePage: pageNumber,
      offset: (pageNumber - 1) * perPage,
    }));
  }, [setSortConfig, perPage]);

  const history = useHistory();

  const tabularData = useMemo(() => data.rows.map((r) => ({
    id: r.id,
    title: r.eventId,
    heading: <Link to={`/training-report/view/${idForLink(r.eventId)}?back_link=hide`}>{r.eventId}</Link>,
    data: [
      {
        title: 'Event title',
        tooltip: r.eventName,
        value: r.eventName,
      },
      {
        title: 'Supporting goals',
        value: (
          <TooltipWithCollection
            collection={(r.goalTemplates || []).map((gt) => gt.standard)}
            collectionTitle={`supporting goals for ${r.eventId}`}
          />
        ),
      },
      {
        title: 'Session name',
        tooltip: r.sessionName,
        value: r.sessionName,
      },
      {
        title: 'Session start date',
        value: r.startDate ? formatDateValue(r.startDate, DATE_DISPLAY_FORMAT) : '',
      },
      {
        title: 'Session end date',
        value: r.endDate ? formatDateValue(r.endDate, DATE_DISPLAY_FORMAT) : '',
      },
      {
        title: 'Topics',
        value: (
          <TooltipWithCollection
            collection={r.objectiveTopics || []}
            collectionTitle={`topics for ${r.eventId}`}
          />
        ),
      },
    ],
    actions: [
      {
        label: 'View',
        onClick: () => history.push(`/training-report/view/${idForLink(r.eventId)}?back_link=hide`),
      },
      {
        label: 'Export',
        onClick: () => getSessionReportsCSVById([r.id], sortConfig, filters),
      },
    ],
  })), [data.rows, history, sortConfig, filters]);

  return (
    <WidgetContainer
      className="training-reports-table--widget-container"
      title={title}
      enableCheckboxes
      checkboxes={reportCheckboxes}
      setCheckboxes={setReportCheckboxes}
      showPagingBottom={data.count > 0}
      loading={loading}
      loadingLabel="Training reports table loading"
      totalCount={data.count}
      offset={sortConfig.offset}
      currentPage={sortConfig.activePage}
      perPage={perPage}
      handlePageChange={handlePageChange}
      titleMargin={{ bottom: 0 }}
      menuItems={menuItems}
      titleGroupClassNames="padding-3 position-relative desktop:display-flex flex-justify flex-align-center flex-gap-2"
    >
      {data.rows.length === 0 && (
      <div>
        <p className="font-serif-md margin-0 padding-10 text-bold text-center">{emptyMsg}</p>
      </div>
      )}
      {data.rows.length > 0 && (
        <HorizontalTableWidget
          headers={[
            'Event title',
            'Supporting goals',
            'Session name',
            'Session start date',
            'Session end date',
            'Topics',
          ]}
          data={tabularData}
          firstHeading="Event ID"
          enableCheckboxes
          checkboxes={reportCheckboxes}
          setCheckboxes={setReportCheckboxes}
          enableSorting
          sortConfig={sortConfig}
          requestSort={requestSort}
          showTotalColumn={false}
          showDashForNullValue
          hideFirstColumnBorder
          stickyFirstColumn
          stickyLastColumn={false}
        />
      )}
    </WidgetContainer>
  );
};

TrainingReportsTable.defaultProps = {
  loading: false,
  emptyMsg: 'No training reports found',
  filters: [],
};

TrainingReportsTable.propTypes = {
  emptyMsg: PropTypes.string,
  loading: PropTypes.bool,
  data: PropTypes.shape({
    rows: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number })),
    count: PropTypes.number,
  }).isRequired,
  requestSort: PropTypes.func.isRequired,
  sortConfig: PropTypes.shape({
    offset: PropTypes.number,
    activePage: PropTypes.number,
    direction: PropTypes.string,
    sortBy: PropTypes.string,
    perPage: PropTypes.number,
  }).isRequired,
  title: PropTypes.string.isRequired,
  setSortConfig: PropTypes.func.isRequired,
  filters: PropTypes.arrayOf(PropTypes.shape({})),
};

export default TrainingReportsTable;
