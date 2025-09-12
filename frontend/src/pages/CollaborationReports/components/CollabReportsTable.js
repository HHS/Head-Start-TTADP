import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Link } from 'react-router-dom';
import Container from '../../../components/Container';
import WidgetContainer from '../../../components/WidgetContainer';
import HorizontalTableWidget from '../../../widgets/HorizontalTableWidget';
import { DATE_DISPLAY_FORMAT } from '../../../Constants';

const CollabReportsTable = ({
  emptyMsg,
  loading,
  offset,
  showCreateMsgOnEmpty,
  title,
  data,
  requestSort,
  sortConfig,
}) => {
  const [reportCheckboxes, setReportCheckboxes] = useState([]);

  const tabularData = useMemo(() => data.rows.map((r) => ({
    heading: <Link to={r.link}>{r.displayId}</Link>,
    data: [
      {
        value: r.name,
      },
      {
        value: r.startDate,
      },
      {
        value: r.author.fullName,
      },
      {
        value: moment(r.createdAt).format(DATE_DISPLAY_FORMAT),
      },
      {
        value: r.collaboratingSpecialists.map((c) => c.fullName).join('\n'),
      },
      {
        value: moment(r.updatedAt).format(DATE_DISPLAY_FORMAT),
      },
    ],
  })), [data.rows]);

  return (
    <>
      <WidgetContainer
        title={title}
        enableCheckboxes
        checkboxes={reportCheckboxes}
        setCheckboxes={setReportCheckboxes}
        showPagingBottom={data.count > 0}
        showPagingTop={false}
        loading={loading}
        loadingLabel="Collaboration reports table loading"
        totalCount={data.count}
        offset={offset}
        perPage={10}
        titleMargin={{ bottom: 3 }}
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
            'Collaborator',
            'Last saved',
          ]}
          data={tabularData}
          firstHeading="Report ID"
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
  offset: 0,
  loading: false,
  emptyMsg: 'You have no Collaboration Reports',
  showCreateMsgOnEmpty: false,
};

CollabReportsTable.propTypes = {
  emptyMsg: PropTypes.string,
  loading: PropTypes.bool,
  offset: PropTypes.number,
  data: PropTypes.shape({
    rows: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number })),
    count: PropTypes.number,
  }).isRequired,
  // setData: PropTypes.func.isRequired,
  requestSort: PropTypes.func.isRequired,
  sortConfig: PropTypes.shape({}).isRequired,
  showCreateMsgOnEmpty: PropTypes.bool,
  title: PropTypes.string.isRequired,

};

export default CollabReportsTable;
