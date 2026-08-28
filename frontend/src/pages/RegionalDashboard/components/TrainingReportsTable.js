import moment from 'moment';
import PropTypes from 'prop-types';
import React, { useCallback, useMemo, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { DATE_DISPLAY_FORMAT } from '../../../Constants';
import TooltipWithCollection from '../../../components/TooltipWithCollection';
import WidgetContainer from '../../../components/WidgetContainer';
import { getSessionReportsCSV, getSessionReportsCSVById } from '../../../fetchers/session';
import HorizontalTableWidget from '../../../widgets/HorizontalTableWidget';
import './TrainingReportsTable.css';

const PER_PAGE = 10;

const TrainingReportsTable = ({
  emptyMsg,
  loading,
  title,
  data,
  requestSort,
  sortConfig,
  setSortConfig,
  filters,
  recipientId,
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
    menuItems.push({
      label: 'Export table',
      onClick: async () => getSessionReportsCSV(sortConfig, filters, recipientId),
    });
  }

  if (selectedReports.length) {
    menuItems.unshift({
      label: 'Export selected rows',
      onClick: async () =>
        getSessionReportsCSVById(selectedReports, sortConfig, filters, recipientId),
    });
  }

  const handlePageChange = useCallback(
    (pageNumber) => {
      setSortConfig((previousConfig) => ({
        ...previousConfig,
        activePage: pageNumber,
        offset: (pageNumber - 1) * perPage,
      }));
    },
    [setSortConfig, perPage]
  );

  const history = useHistory();

  const tabularData = useMemo(
    () =>
      data.rows.map((r) => ({
        id: r.id,
        title: r.eventId,
        heading: <Link to={`/training-report/view/${r.eventId}?back_link=hide`}>{r.eventId}</Link>,
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
            value: r.startDate ? moment(r.startDate).format(DATE_DISPLAY_FORMAT) : '',
          },
          {
            title: 'Session end date',
            value: r.endDate ? moment(r.endDate).format(DATE_DISPLAY_FORMAT) : '',
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
            onClick: () => history.push(`/training-report/view/${r.eventId}?back_link=hide`),
          },
          {
            label: 'Export',
            onClick: () => getSessionReportsCSVById([r.id], sortConfig, filters, recipientId),
          },
        ],
      })),
    [data.rows, history, sortConfig, filters, recipientId]
  );

  return (
    <WidgetContainer
      className="training-reports-table--widget-container"
      title={title}
      subtitle="Approved sessions from training events."
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
            { displayName: 'Session start date', name: 'startDate' },
            { displayName: 'Session end date', name: 'endDate' },
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
        />
      )}
    </WidgetContainer>
  );
};

TrainingReportsTable.defaultProps = {
  loading: false,
  emptyMsg: 'No training reports found',
  filters: [],
  recipientId: null,
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
  recipientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default TrainingReportsTable;
