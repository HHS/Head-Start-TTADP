import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Link } from 'react-router-dom';
import Container from '../../../components/Container';
import WidgetContainer from '../../../components/WidgetContainer';
import HorizontalTableWidget from '../../../widgets/HorizontalTableWidget';
import { DATE_DISPLAY_FORMAT } from '../../../Constants';
import TooltipWithCollection from '../../../components/TooltipWithCollection';
import './CollabReportsTable.css';
import { getReportsCSV, getReportsCSVById } from '../../../fetchers/collaborationReports';

const ALL = 2; // this is a constant

const CollabReportsTable = ({
  emptyMsg,
  loading,
  showCreateMsgOnEmpty,
  title,
  data,
  requestSort,
  sortConfig,
  setSortConfig,
}) => {
  const [reportCheckboxes, setReportCheckboxes] = useState({});

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
        onClick: async () => getReportsCSV(sortConfig),
      },
    );
  }

  if (selectedReports.length) {
    menuItems.unshift(
      {
        label: 'Export selected rows',
        onClick: async () => getReportsCSVById(selectedReports, sortConfig),
      },
    );
  }

  const handlePageChange = useCallback((e) => {
    let newValue = Number(e.target.value);
    if (newValue === ALL) {
      newValue = 'all';
    }

    setSortConfig((previousConfig) => ({
      ...previousConfig,
      perPage: newValue,
    }));
  }, [setSortConfig]);

  const tabularData = useMemo(() => data.rows.map((r) => ({
    id: r.id,
    heading: <Link to={r.link}>{r.displayId}</Link>,
    data: [
      {
        title: 'Activity name',
        tooltip: r.name,
        value: r.name,
      },
      {
        title: 'Date started',
        value: r.startDate,
      },
      {
        title: 'Creator',
        value: r.author.fullName,
        tooltip: r.author.fullName,
      },
      {
        title: 'Created date',
        value: moment(r.createdAt).format(DATE_DISPLAY_FORMAT),
      },
      {
        title: 'Collaborators',
        value: <TooltipWithCollection collection={r.collaboratingSpecialists.map((c) => c.fullName)} collectionTitle={`collaborators for ${r.displayId}`} />,
      },
      {
        title: 'Last saved',
        value: moment(r.updatedAt).format(DATE_DISPLAY_FORMAT),
      },
    ],
  })), [data.rows]);

  return (
    <>
      <WidgetContainer
        className="collab-reports-table--widget-container"
        title={title}
        enableCheckboxes
        checkboxes={reportCheckboxes}
        setCheckboxes={setReportCheckboxes}
        showPagingBottom={data.count > 0}
        loading={loading}
        loadingLabel="Collaboration reports table loading"
        totalCount={data.count}
        offset={sortConfig.offset}
        currentPage={sortConfig.activePage}
        perPage={10}
        titleMargin={{ bottom: 1 }}
        menuItems={menuItems}
        showPagingTop={data.rows.length > 0}
        paginationCardTopProps={{
          perPageChange: handlePageChange,
          noXofX: true,
          spaceBetweenSelectPerPageAndContext: 2,
        }}
        titleGroupClassNames={data.rows.length ? 'padding-x-3 padding-top-3 position-relative' : 'padding-x-3 padding-top-3 position-relative desktop:display-flex flex-justify flex-align-center flex-gap-2'}
      >
        { data.rows.length === 0 && (
        <Container className="landing" paddingX={0} paddingY={0}>
          <div className="text-center padding-10">
            <p className="usa-prose text-center bold">
              <strong>{ emptyMsg }</strong>
              { showCreateMsgOnEmpty && (
              <>
                <br />
                Document your work connecting Head Start programs with state-level systems.
                <br />
                To get started, click the &quot;New Collaboration Report&quot; button.
              </>
              )}
            </p>
          </div>
        </Container>
        )}
        { data.rows.length > 0 && (
        <HorizontalTableWidget
          headers={[
            'Activity name',
            'Date started',
            'Creator',
            'Created date',
            'Collaborators',
            'Last saved',
          ]}
          data={tabularData}
          firstHeading="Report&nbsp;ID"
          enableCheckboxes
          checkboxes={reportCheckboxes}
          setCheckboxes={setReportCheckboxes}
          enableSorting
          sortConfig={sortConfig}
          requestSort={requestSort}
          showTotalColumn={false}
          showDashForNullValue
        />
        )}
      </WidgetContainer>
    </>
  );
};

CollabReportsTable.defaultProps = {
  loading: false,
  emptyMsg: 'You have no Collaboration Reports',
  showCreateMsgOnEmpty: false,
};

CollabReportsTable.propTypes = {
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
  }).isRequired,
  showCreateMsgOnEmpty: PropTypes.bool,
  title: PropTypes.string.isRequired,
  setSortConfig: PropTypes.func.isRequired,
};

export default CollabReportsTable;
